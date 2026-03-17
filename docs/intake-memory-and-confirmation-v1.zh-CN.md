# 前台 Agent 多轮记忆与确认层 v1

## 目标

让前台 Agent 在多轮对话里更稳定地区分：
- 用户是在开启新话题
- 用户是在接上一轮问题继续回答
- 用户是在确认推进
- 用户是在纠正或否定

这样前台就不会把每一句都当成新需求，也不会漏接“可以，来吧”“不是这个意思”这类自然表达。

## 输入

- 当前用户消息
- 最近几轮对话历史
- 当前 `unknowns`
- 当前 workflow 状态

## 输出

- `mode`
  - `new_topic`
  - `free_chat`
  - `answering_question`
  - `confirming`
  - `correcting`
  - `rejecting`
- `recentAssistantQuestion`
- `pendingUnknown`
- `focusHint`
- `shouldContinueThread`

## 当前规则

- 如果用户在纠正上一轮内容，进入 `correcting`
- 如果用户明确否定当前推进，进入 `rejecting`
- 如果用户用了确认语且上一轮助手在提问，进入 `confirming`
- 如果上一轮助手在提问，而这轮用户继续补充信息，进入 `answering_question`
- 如果当前是纯寒暄或介绍型对话，进入 `free_chat`
- 其他情况默认为 `new_topic`

## 作用点

- 给 skill 路由提供上下文依据
- 给回复编排层提供单轮焦点
- 给模型提示词提供“当前这轮到底是在继续、确认还是纠正”的上下文

## 当前边界

- 这层还不是长期记忆，只关注最近几轮
- 这层不负责最终业务判定，只负责提供更稳的对话上下文
