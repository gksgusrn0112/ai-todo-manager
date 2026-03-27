import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawPrompt = body.prompt || "";
    const currentTime = body.currentTime || new Date().toISOString();

    // 1. 전처리 (Preprocessing)
    let sanitizedPrompt = rawPrompt
      .replace(/[\u{10000}-\u{10FFFF}]/gu, "") // 이모지 등 서로게이트 페어 영역 특수문자 제거
      .replace(/\s+/g, " ") // 연속된 공백을 하나로 통합
      .trim(); // 앞뒤 공백 제거

    // 대소문자 정규화 (영어 입력일 경우 소문자로 통일, 한글에는 영향 없음)
    sanitizedPrompt = sanitizedPrompt.toLowerCase();

    // 2. 입력 검증 (Validation)
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

    // 3. AI 파싱 요청 (기존 프롬프트 규칙 유지)
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      system: `너는 사용자의 자연어 입력을 분석해서 할 일(Todo) 데이터로 변환하는 전문 AI 어시스턴트야.
      현재 기준 시간은 "${currentTime}"야. 이 시간을 기준으로 모든 날짜와 시간을 정확히 계산해.
      
      [규칙]
      1. 제목(title): 입력된 내용 중 가장 핵심 행동만 짧고 명확하게 추출해.
      2. 설명(description): 부가적인 내용, 메모를 분리해서 적고, 입력이 너무 짧으면 네가 알아서 필요한 세부 할 일을 제안해서 채워. ("메모:", "설명:" 뒤의 내용은 무조건 포함할 것)
      3. 날짜 처리 규칙: "오늘"->현재 날짜, "내일"->현재+1일, "모레"->현재+2일, "이번 주 금요일"->가장 가까운 금요일, "다음 주 월요일"->다음 주 월요일.
      4. 시간 처리 규칙: "아침"->09:00, "점심"->12:00, "오후"->14:00, "저녁"->18:00, "밤"->21:00. 언급이 없으면 "09:00" 적용.
      5. 우선순위(priority): high(급하게, 중요한, 빨리, 꼭, 반드시), low(여유롭게, 천천히, 언젠가), medium(보통, 적당히 혹은 키워드 없음).
      6. 카테고리(category): 업무(회의, 보고서, 프로젝트), 개인(쇼핑, 친구, 가족), 건강(운동, 병원, 요가), 학습(공부, 책, 강의) 중 매칭하거나 문맥에 맞게 1~2개 생성.
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
          .default("09:00")
          .describe("마감 시간 (HH:MM 형식, 24시간제)"),
        priority: z
          .enum(["high", "medium", "low"])
          .describe("문맥 및 키워드에 따른 우선순위"),
        category: z.string().describe("쉼표로 구분된 카테고리 키워드"),
      }),
    });

    // 4. 후처리 (Postprocessing)
    // 4-1. 필수 필드 누락 시 기본값 설정
    let finalTitle = object.title?.trim() || "새 할 일";
    let finalDueDate = object.due_date;
    const finalDueTime = object.due_time || "09:00";
    const finalPriority = object.priority || "medium";
    const finalCategory = object.category || "일반";
    const finalDescription = object.description || "";

    // 4-2. 제목 길이 자동 조정
    if (finalTitle.length > 50) {
      finalTitle = finalTitle.substring(0, 47) + "..."; // 너무 길면 자름
    } else if (finalTitle.length < 2) {
      finalTitle =
        sanitizedPrompt.substring(0, 20) +
        (sanitizedPrompt.length > 20 ? "..." : ""); // 너무 짧으면 원본 입력에서 추출
    }

    // 4-3. 생성된 날짜가 과거인지 확인 및 보정 (과거 날짜면 오늘로 강제 변경)
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

    // 5. 오류 응답 처리
    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    // 429: API 호출 한도 초과 에러 감지 (Vercel AI SDK나 Fetch 에러 기준)
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

    // 500: 그 외의 모든 서버/AI 에러
    return NextResponse.json(
      {
        error:
          "AI가 데이터를 처리하다가 꼬였어. 문장을 조금 바꿔서 다시 시도해 볼래?",
      },
      { status: 500 },
    );
  }
}
