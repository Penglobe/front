// app/pages/point/webview.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { ActivityIndicator, View, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as LinkingExpo from "expo-linking";
import { apiFetch } from "@services/authService";
import CustomAlert from "@components/CustomAlert";

export default function PointWebviewRoute() {
  const router = useRouter();
  const { amount: rawAmount } = useLocalSearchParams();
  const amount = useMemo(() => Number(rawAmount ?? 0), [rawAmount]);

  const [merchantUid, setMerchantUid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const processedRef = useRef(false); // 중복 처리 방지 플래그

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertNext, setAlertNext] = useState(null);

  // 결제 검증 공통 함수 (onMessage/딥링크 모두 여기로)
  const verifyAndClose = useCallback(
    async ({ imp_uid, merchant_uid }) => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        if (!imp_uid || !merchant_uid) {
          setAlertTitle("오류");
          setAlertMessage("검증 정보가 올바르지 않습니다.");
          setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
          setAlertVisible(true);
          return;
        }

        const res = await apiFetch(`/api/payments/verify/${imp_uid}`, {
          method: "POST",
          body: { merchant_uid },
        });

        if (res.ok) {
          setAlertTitle("결제 성공");
          setAlertMessage("얼음 구매가 완료되었습니다.");
          setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
          setAlertVisible(true);
        } else {
          setAlertTitle("결제 취소");
          setAlertMessage("결제가 취소되었습니다.");
          setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
          setAlertVisible(true);
        }
      } catch (e) {
        setAlertTitle("오류");
        setAlertMessage("결제 결과 처리 중 문제가 발생했습니다.");
        setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
        setAlertVisible(true);
      }
    },
    [router]
  );

  // 결제 준비(merchant_uid 발급)
  useEffect(() => {
    const prepare = async () => {
      try {
        if (!amount || Number.isNaN(amount) || amount <= 0) {
          setAlertTitle("결제 오류");
          setAlertMessage("유효하지 않은 금액입니다.");
          setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
          setAlertVisible(true);
          return;
        }

        const res = await apiFetch("/api/payments/prepare", {
          method: "POST",
          body: { amount }, // apiFetch가 JSON.stringify 처리
        });

        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setMerchantUid(json?.data); // 서버에서 발급한 merchant_uid
      } catch (e) {
        setAlertTitle("결제 준비 오류");
        setAlertMessage(e?.message || "서버와 통신 실패");
        setAlertNext(() => () => router.replace("/pages/point/pointHistory"));
        setAlertVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    prepare();
  }, [amount, router]);

  // 딥링크 리스너 (m_redirect_url로 복귀 시 처리)
  useEffect(() => {
    const handler = ({ url }) => {
      const parsed = LinkingExpo.parse(url);
      if (parsed.scheme !== "penglobe") return;
      if (!parsed.path || !parsed.path.startsWith("pay/complete")) return;

      const imp_uid = parsed.queryParams?.imp_uid || null;
      const mid = parsed.queryParams?.merchant_uid || merchantUid || null;
      verifyAndClose({ imp_uid, merchant_uid: mid });
    };

    const sub = Linking.addEventListener("url", handler);
    // 혹시 초기 URL로 열린 경우도 처리
    Linking.getInitialURL().then((url) => url && handler({ url }));

    return () => sub.remove();
  }, [merchantUid, verifyAndClose]);

  // WebView -> RN 메시지 (일부 환경에서 콜백이 올 때 처리)
  const onMessage = useCallback(
    async (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type !== "payment-result") return;

        if (data.success) {
          await verifyAndClose({
            imp_uid: data.imp_uid,
            merchant_uid: data.merchant_uid || merchantUid,
          });
        } else {
          if (!processedRef.current) {
            processedRef.current = true;
            setAlertTitle("결제 취소");
            setAlertMessage(data.error_msg || "결제가 취소되었습니다.");
            setAlertNext(
              () => () => router.replace("/pages/point/pointHistory")
            );
            setAlertVisible(true);
          }
        }
      } catch {
        // 파싱 실패 등은 무시 (딥링크로 커버됨)
      }
    },
    [verifyAndClose, router, merchantUid]
  );

  // 아임포트 결제용 HTML (m_redirect_url 포함)
  const HTML_TEMPLATE = useMemo(() => {
    const IMP_CODE = "imp22234788";
    const SCHEME = "penglobe";

    return `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
          <script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
          <script src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"></script>
        </head>
        <body>
          <script>
            try {
              var IMP = window.IMP;
              IMP.init("${IMP_CODE}");

              var params = {
                pg: "html5_inicis",
                pay_method: "card",
                merchant_uid: "${merchantUid || ""}",
                name: "${amount}원 포인트 충전",
                amount: ${Number.isFinite(amount) ? amount : 0},
                buyer_name: "홍길동",
                app_scheme: "${SCHEME}",
                // 결제 완료 후 PortOne이 앱으로 리다이렉트 (일부 PG는 imp_uid를 자동으로 쿼리에 추가)
                m_redirect_url: "${SCHEME}://pay/complete?merchant_uid=${
                  merchantUid || ""
                }"
              };

              IMP.request_pay(params, function(rsp) {
                // 콜백이 정상적으로 오는 환경에서는 postMessage로도 알림
                try {
                  var result = {
                    type: "payment-result",
                    success: !!rsp.success,
                    imp_uid: rsp.imp_uid || null,
                    merchant_uid: rsp.merchant_uid || null,
                    error_msg: rsp.error_msg || null
                  };
                  window.ReactNativeWebView.postMessage(JSON.stringify(result));
                } catch(e) {}
              });
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "payment-result",
                success: false,
                error_msg: "결제 초기화 중 오류가 발생했습니다."
              }));
            }
          </script>
        </body>
      </html>
    `;
  }, [merchantUid, amount]);

  if (isLoading || !merchantUid) {
    return (
      <>
        <Stack.Screen options={{ title: "결제" }} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <WebView
        source={{ html: HTML_TEMPLATE }}
        onMessage={onMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
        startInLoadingState
        style={{ flex: 1, marginTop: 22, marginBottom: 40 }}
        renderLoading={() => (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" />
          </View>
        )}
        onShouldStartLoadWithRequest={(req) => {
          const url = req.url;

          // 0) about:blank 는 그냥 웹뷰가 처리하게 둠
          if (url === "about:blank") {
            return true;
          }

          // 1) penglobe:// (앱 딥링크 - 결제 완료)
          if (url.startsWith("penglobe://pay/complete")) {
            const parsed = LinkingExpo.parse(url);
            const imp_uid = parsed.queryParams?.imp_uid || null;
            const mid = parsed.queryParams?.merchant_uid || merchantUid || null;
            verifyAndClose({ imp_uid, merchant_uid: mid });
            return false; // 웹뷰에서 로드 막음
          }

          // 2) http, https는 그대로 웹뷰에서 열기
          if (url.startsWith("http") || url.startsWith("https")) {
            return true;
          }

          // 3) 그 외 (intent://, kakaotalk://, naversearchapp://, ispmobile:// 등)
          try {
            Linking.openURL(url);
          } catch (e) {
            console.warn("외부 앱 열기 실패:", e.message);
          }
          return false; // 웹뷰에서 처리 안 함
        }}
      />
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => {
          setAlertVisible(false);
          if (typeof alertNext === "function") {
            const go = alertNext;
            setAlertNext(null);
            go();
          }
        }}
      />
    </>
  );
}
