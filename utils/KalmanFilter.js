// utils/KalmanFilter.js
export default class KalmanFilter {
  constructor({ R = 0.01, Q = 3 } = {}) {
    this.R = R; // 측정 잡음 공분산 (낮을수록 센서 신뢰 ↑)
    this.Q = Q; // 프로세스 잡음 공분산 (낮을수록 움직임 억제 ↑)
    this.A = 1;
    this.B = 0;
    this.C = 1;
    this.cov = NaN;
    this.x = NaN;
  }

  filter(z) {
    if (isNaN(this.x)) {
      this.x = (1 / this.C) * z;
      this.cov = (1 / this.C) * this.Q * (1 / this.C);
    } else {
      // 예측 단계
      const predX = this.A * this.x;
      const predCov = this.A * this.cov * this.A + this.Q;

      // 보정 단계
      const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.R));
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }
    return this.x;
  }

  lastMeasurement() {
    return this.x;
  }

  setState(x, cov) {
    this.x = x;
    this.cov = cov;
  }
}
