import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawPrompt = body.prompt || "";
    const currentTime = body.currentTime || new Date().toISOString();

    let sanitizedPrompt = rawPrompt
      .replace(/[\u{10000}-\u{10FFFF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    sanitizedPrompt = sanitizedPrompt.toLowerCase();

    if (!sanitizedPrompt || sanitizedPrompt.length < 2) {
      return NextResponse.json(
        { error: "입력값이 너무 짧아. 무슨 일을 할지 2자 이상 적어 줘!" },
        { status: 400 },
      );
    }

    if (sanitizedPrompt.length > 500) {
      return NextResponse.json(
        { error: "입력값이 너무 길어. 500자 이내로 핵심만 요약해서 적어 줘!" },
        { status: 400 },
      );
    }

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      system: `너는 사용자의 자연어 입력을 분석해서 할 일(Todo) 데이터로 변환하는 전문 AI 어시스턴트야.
      현재 기준 시간은 "${currentTime}"야. 이 시간을 기준으로 모든 날짜와 시간을 정확히 계산해.
      
      [규칙]
      1. 제목(title): 입력된 내용 중 가장 핵심 행동만 짧고 명확하게 추출해.
      2. 설명(description): 부가적인 내용, 메모를 분리해서 적고, 입력이 너무 짧으면 네가 알아서 필요한 세부 할 일을 제안해서 채워.
      3. 날짜 처리 규칙: "오늘"->현재 날짜, "내일"->현재+1일, "이번 주 금요일"->가장 가까운 금요일.
      4. 시간 처리 규칙: "아침"->09:00, "점심"->12:00, "오후"->14:00, "저녁"->18:00.
      5. 우선순위(priority): high(급하게, 중요한), low(여유롭게), medium(보통 혹은 키워드 없음).
      6. 카테고리(category): 업무, 개인, 건강, 학습 중 매칭하거나 문맥에 맞게 생성.
      7. 출력 형식: 제공된 JSON 스키마를 100% 준수해.`,
      prompt: sanitizedPrompt,
      schema: z.object({
        title: z.string().describe("할 일의 핵심 제목"),
        description: z
          .string()
          .describe("부가적인 내용, 메모, 또는 제안하는 세부 할 일 목록"),
        due_date: z.string().optional().describe("마감일 (YYYY-MM-DD 형식)"),
        due_time: z
          .string()
          .optional()
          .describe("마감 시간 (HH:MM 형식, 24시간제)"),
        priority: z
          .enum(["high", "medium", "low"])
          .describe("문맥 및 키워드에 따른 우선순위"),
        category: z.string().describe("쉼표로 구분된 카테고리 키워드"),
      }),
    });

    let finalTitle = object.title?.trim() || "새 할 일";
    let finalDueDate = object.due_date;
    const finalDueTime = object.due_time || "09:00";
    const finalPriority = object.priority || "medium";
    const finalCategory = object.category || "일반";
    const finalDescription = object.description || "";

    if (finalTitle.length > 50) {
      finalTitle = finalTitle.substring(0, 47) + "...";
    } else if (finalTitle.length < 2) {
      finalTitle =
        sanitizedPrompt.substring(0, 20) +
        (sanitizedPrompt.length > 20 ? "..." : "");
    }

    if (finalDueDate) {
      const todayIso = new Date(currentTime).toISOString().split("T")[0];
      if (finalDueDate < todayIso) {
        finalDueDate = todayIso;
      }
    }

    const processedResult = {
      title: finalTitle,
      description: finalDescription,
      due_date: finalDueDate,
      due_time: finalDueTime,
      priority: finalPriority,
      category: finalCategory,
    };

    return NextResponse.json({ result: processedResult });
  } catch (error: unknown) {
    console.error("AI Parsing Error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("quota")
    ) {
      return NextResponse.json(
        {
          error:
            "앗, API 호출 한도를 초과했어! 잠시 기다렸다가 다시 시도해 줘.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error:
          "AI가 데이터를 처리하다가 꼬였어. 문장을 조금 바꿔서 다시 시도해 볼래?",
      },
      { status: 500 },
    );
  }
}
