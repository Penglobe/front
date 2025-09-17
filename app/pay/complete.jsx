import { useEffect, useRef, useState, useCallback } from "react";
import { View, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as LinkingExpo from "expo-linking";
import { apiFetch } from "@services/authService";
import CustomAlert from "@components/CustomAlert";

export default function PayComplete() {
  const router = useRouter();
  const params = useLocalSearchParams(); // { imp_uid?, merchant_uid? }
  const [impUid, setImpUid] = useState(params?.imp_uid ?? null);
  const [mid, setMid] = useState(params?.merchant_uid ?? null);
  const processedRef = useRef(false);

  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [next, setNext] = useState(null);

  const goHistory = useCallback(
    () => router.replace("/pages/point/pointHistory"),
    [router]
  );

  // 일부 환경에서 쿼리가 비어 들어오는 것 대비 (콜드스타트/백그라운드 복귀)
  useEffect(() => {
    (async () => {
      if (impUid && mid) return;
      const url = await Linking.getInitialURL();
      if (!url) return;
      const parsed = LinkingExpo.parse(url);
      const q = parsed?.queryParams || {};
      if (!impUid && q.imp_uid) setImpUid(q.imp_uid);
      if (!mid && q.merchant_uid) setMid(q.merchant_uid);
    })();
  }, [impUid, mid]);

  const verify = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;

    try {
      if (!mid) {
        setTitle("오류");
        setMsg("주문번호를 확인할 수 없습니다.");
        setNext(() => goHistory);
        setVisible(true);
        return;
      }
      if (!impUid) {
        // 서버가 imp_uid 없이 검증은 없으니 안내 후 내역으로 이동
        setTitle("결제 완료");
        setMsg("검증 ID(imp_uid)가 없어 내역으로 이동합니다.");
        setNext(() => goHistory);
        setVisible(true);
        return;
      }

      const res = await apiFetch(`/api/payments/verify/${impUid}`, {
        method: "POST",
        body: { merchant_uid: mid },
      });

      if (res.ok) {
        setTitle("결제 성공");
        setMsg("얼음 충전이 완료되었습니다.");
      } else {
        setTitle("결제 취소");
        setMsg("결제가 취소되었거나 실패했습니다.");
      }
    } catch {
      setTitle("오류");
      setMsg("결제 결과 처리 중 문제가 발생했습니다.");
    } finally {
      setNext(() => goHistory);
      setVisible(true);
    }
  }, [impUid, mid, goHistory]);

  // 파라미터가 준비되면 검증 실행 (최소 mid 확보 후)
  useEffect(() => {
    if (mid) verify();
  }, [mid, verify]);

  // 최후 보강: 2초 내 처리 안 되면 안내 후 탈출 (흰 화면 방지)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!processedRef.current) {
        processedRef.current = true;
        setTitle("처리 안내");
        setMsg(
          "결제 앱에서 복귀했지만 검증 정보를 받지 못했습니다. 내역으로 이동합니다."
        );
        setNext(() => goHistory);
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [goHistory]);

  return (
    <>
      <Stack.Screen options={{ title: "결제 처리중..." }} />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
      <CustomAlert
        visible={visible}
        title={title}
        message={msg}
        onConfirm={() => {
          setVisible(false);
          if (typeof next === "function") {
            const go = next;
            setNext(null);
            go();
          }
        }}
      />
    </>
  );
}
