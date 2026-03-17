import {
  EMBEDDED_KNOWLEDGE_SECTIONS,
  LAB_KNOWLEDGE_SECTIONS,
  type KnowledgeSection,
} from "./knowledge-config";

function buildKnowledgePrompt(title: string, sections: KnowledgeSection[]) {
  return [
    title,
    ...sections.flatMap((section) => [
      `${section.title}:`,
      ...section.items.map((item) => `- ${item}`),
    ]),
  ].join("\n");
}

export function buildEmbeddedKnowledgePrompt() {
  return buildKnowledgePrompt(
    "你掌握一套用于前台接待的电子 DIY 与嵌入式通用常识：",
    EMBEDDED_KNOWLEDGE_SECTIONS,
  );
}

export function buildLabKnowledgePrompt() {
  return buildKnowledgePrompt(
    "你还了解这个实验室当前常见的产品方向与接待经验：",
    LAB_KNOWLEDGE_SECTIONS,
  );
}

export function getEmbeddedKnowledgeSections() {
  return EMBEDDED_KNOWLEDGE_SECTIONS;
}

export function getLabKnowledgeSections() {
  return LAB_KNOWLEDGE_SECTIONS;
}
