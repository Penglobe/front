import Foundation
import React
import KakaoSDKAuth
import KakaoSDKUser

@objc(KakaoAuthModule)
class KakaoAuthModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  private var lastToken: OAuthToken? // 마지막으로 받은 토큰 저장

  /// 카카오 로그인 + 프로필(닉네임/이미지/이메일) 반환
  @objc(loginWithProfile:rejecter:)
  func loginWithProfile(resolve: @escaping RCTPromiseResolveBlock,
                        reject: @escaping RCTPromiseRejectBlock) {

    let scopes = ["profile_nickname", "profile_image", "account_email"]

    func resolveMe(_ user: User?) {
      let acc = user?.kakaoAccount
      let prof = acc?.profile
      let idString = user.flatMap { $0.id }.map(String.init) ?? ""

      resolve([
        "id": idString,
        "nickname": prof?.nickname ?? "",
        "email": acc?.email ?? "",
        "profileImageUrl": prof?.profileImageUrl?.absoluteString ?? "",
        "accessToken": lastToken?.accessToken ?? "" // 저장된 토큰 전달
      ])
    }

    func fetchMe() {
      UserApi.shared.me { user, err in
        if let err = err {
          reject("ME_ERROR", "profile fetch failed", err)
          return
        }

        // 이메일이 비어 있고 추가 동의가 필요한 경우 → 스코프 추가 동의 요청
        if user?.kakaoAccount?.email == nil,
           user?.kakaoAccount?.emailNeedsAgreement == true {

          UserApi.shared.loginWithKakaoAccount(scopes: ["account_email"]) { token, err in
            if let err = err {
              reject("SCOPE_ERROR", "email scope consent failed", err)
              return
            }
            self.lastToken = token // 추가 동의 후 토큰 저장
            UserApi.shared.me { user2, err2 in
              if let err2 = err2 {
                reject("ME_ERROR", "profile fetch failed (after consent)", err2)
                return
              }
              resolveMe(user2)
            }
          }
          return
        }

        resolveMe(user)
      }
    }

    let loginWithAccount: () -> Void = {
      UserApi.shared.loginWithKakaoAccount(scopes: scopes) { token, err in
        if let err = err {
          reject("LOGIN_ERROR", "account login failed", err)
          return
        }
        self.lastToken = token // 계정 로그인 성공 시 토큰 저장
        fetchMe()
      }
    }

    if UserApi.isKakaoTalkLoginAvailable() {
      UserApi.shared.loginWithKakaoTalk { token, err in
        if let _ = err {
          // 취소/실패 시 계정 로그인으로 폴백
          loginWithAccount()
        } else {
          self.lastToken = token // 카톡 로그인 성공 시 토큰 저장
          fetchMe()
        }
      }
    } else {
      loginWithAccount()
    }
  }
}

