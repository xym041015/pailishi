# 手写识别评测基准（v2 微调路线的验收集）

来源：2026-11-15 手写板模式 spike（本地模型手写能力实测）。

- `images/hwe_*.png` — 5 张**真实手写**（opendatalab/UniMERNet 仓库演示图，CROHME/HME100K 出身；紫墨水照片/铅笔作业/红笔批改等真实场景）
- `images/f*.png` `g*.png` — 合成工整手写（ChalkboardSE + 抖动；g1 为 v2 画法修正版）
- `real_cases.json` — 真实样本的真值转写（人工目视）
- `run-eval.mjs` — Node 评测脚本：**逐字复刻站点管线**（image-js 预处理 + @huggingface/transformers 推理，模型走 snaplatex.cn /hf/* 同源代理）

## 基线（v1 本地模型，2026-11-15）

- 画板等效（真实笔画二值化）：2/5 完美（分数加法、几何角度）、3/5 结构正确数字/细节有误
- 照片原图（未二值化）：0/4 全崩（reverseColor 误反色 + 分辨率压缩）
- 合成工整：6/7 完美（(a+b)² 丢上标、2a×3b 的 × 认错）

## 运行

```bash
cd docs/superpowers/handwriting-eval && npm init -y && npm i @huggingface/transformers@3 image-js
node run-eval.mjs
```

## v2 验收标准

本地模型微调（CROHME/HME100K）后：真实手写完美率 ≥ 基线 +2；照片场景 ≥1/4 可用。
