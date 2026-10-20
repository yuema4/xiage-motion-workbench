import type { EffectId } from "../types";

export function defaultTextForEffect(effectId: EffectId) {
  switch (effectId) {
    case "info-board":
      return "第一条要点\n第二条要点\n第三条要点";
    case "strike-flip":
      return "原来的判断 / 新的判断";
    case "metric-arrow":
      return "把指标拉回安全线\n实测方案给出的三步动作\n关键指标\n真的有效\n52万\n-88%\n6.6万\n优化后";
    case "odometer-digit-roll":
      return "99.98%";
    case "episode-counter-card":
      return "300,000+\nAIGC 全链路 · 那期\nVIEWS · 播放";
    case "project-comparison":
      return "项目 A | 速度最快 | 自动化能力 | 适合快速验证，后续再精修。 | 92\n项目 B | 稳定性强 | 流程完整 | 适合正式交付，但启动成本更高。 | 86\n项目 C | 成本更低 | 手动调整 | 适合轻量任务，复杂项目会吃力。 | 74\n项目 D | 可扩展 | 长期资产 | 前期慢一点，但复用价值更高。 | 69";
    case "split-evidence":
      return "人物讲解\n演示画面\n重点结论";
    case "amber-proof-title":
      return "只花了几分钟";
    case "amber-progress-ring":
      return "03\n完成率提升\nPERCENT / COMPLETION\n75%\n数字更小一档，百分号更克制，中心更干净";
    case "amber-scene-steps":
      return "直接上传 SRT 口播稿\n大模型做语义分割\n配适合的动效\n输出 JSON 卡点呈现";
    case "amber-replicate-flow":
      return "01\nFULL CONTROL\n所有动效 · 你自己\n每一张动效卡\n位置\n大小\n颜色\n字体\n快慢";
    case "amber-library-grid":
      return "提示框\n流程线\n参数条\n标题卡\n证据卡\n增长 +1";
    case "income-split-card":
      return "上月自媒体总收入14000元，其中AI创作基金12636元";
    case "dot-grid-stat-card":
      return "拆解200家AI创业公司，73%都是套壳产品";
    case "three-layer-mind-map":
      return "短视频破十万播放三大核心规则";
    case "glass-process-bubble":
      return "AI自动化流程能大幅提升内容创作效率";
    case "chain-bubble-flow":
      return "编辑台的逻辑\n先按自己的喜好 · 建一个动效素材库\n再搭建一个编辑台\n以后每条视频 · 只需几分钟";
    case "review-split-card":
      return "AI 视觉工作流\n场景\nVAST\n人物\nTINY\n建筑更简洁\nMINIMAL";
    case "pressure-bar-comparison":
      return "资本开支压力\n微软 CY2026 | 约 $190B | 92\nMeta 2025 指引 | $125B-145B | 68\n亚马逊 P&E 增量 | +$59.3B | 38\n苹果 | 相对稳定 | 16\n重点不是谁花最多，而是这些支出什么时候停止稀释毛利率与自由现金流。";
    case "numeric-punch-card":
      return "5\nMIN\n同款复刻\nSAME RESULT";
    case "three-step-action-card":
      return "把满格调回 20 万\n动作 1|状态栏校准|满格 100 万 → 20 万，显示绝对数字\n动作 2|到线就清理|黄/红就动手，clear 或重开对话\n动作 3|及时开新对话|新话题新窗口，别让一个对话塞几千轮\n绿 · 随便干|黄 · 准备换气|红 · 已在付价";
    case "three-step-checklist":
      return "哪几步是 AI 干的？\n回到问题 / 看完整流程\n创意|想法 / 大纲 / 分镜\n资产|素材 / 模板 / 数据\n成片|生成 / 合成 / 审核";
    case "dual-metric-ruler":
      return "一整条生产链\n上回 · 方案 A|结果 A|22\n这回 · 方案 B|结果 B|82";
    case "workflow-action-list":
      return "拆解工作流|OPEN THE WORKFLOW\n丢一个想法|DROP ONE IDEA\n评论区反馈|TELL ME IN COMMENTS";
    case "task-module-breakdown":
      return "内容生产系统\nCONTENT PRODUCTION SYSTEM\n实拍素材\n多视图资产\n肖像风险控制";
    case "large-number-dot-matrix":
      return "30,000\n套\nFILM-GRADE ASSETS · VERIFIED\n角色资产\n场景资产";
    case "multi-step-toolchain":
      return "脚本|SCRIPT\n图片|IMAGE\n视频|VIDEO\n配音|VOICE\n剪辑|EDIT";
    case "key-phrase-highlight":
      return "核心运营能力|OPEN WORKFLOW\n评论区智能体|COMMENT AGENT\n数据看板|DATA DASHBOARD";
    default:
      return "新的动效文案";
  }
}

export function defaultTitleColorForBaseEffect(effectId: EffectId) {
  if (effectId === "info-board") return "#111111";
  if (effectId === "ambient-wash")
    return "#ffffff";
  if (effectId === "amber-progress-ring") return "#1f2937";
  if (effectId === "odometer-digit-roll")
    return "#111111";
  if (effectId === "episode-counter-card") return "#4dd0ff";
  if (effectId === "income-split-card") return "#111111";
  if (effectId === "dot-grid-stat-card") return "#f8fdff";
  if (effectId === "three-layer-mind-map") return "#f8fdff";
  if (effectId === "glass-process-bubble") return "#f8fdff";
  if (effectId === "chain-bubble-flow") return "#f8fdff";
  if (effectId === "review-split-card") return "#f8fdff";
  if (effectId === "pressure-bar-comparison") return "#f8fdff";
  if (effectId === "numeric-punch-card") return "#f8fdff";
  if (effectId === "three-step-action-card") return "#12213a";
  if (effectId.startsWith("amber-")) return "#fff8e8";
  return undefined;
}

