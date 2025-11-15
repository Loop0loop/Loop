/**
 * 🔥 Recent Edits 필터링 유틸리티
 * 3일 이내 편집한 문서만 필터링
 */

interface RecentFile {
  readonly id: string;
  readonly name: string;
  readonly project: string;
  readonly time: string;
  readonly status: string;
}

/**
 * 3일 이내 편집한 문서만 필터링
 * @param files - 전체 파일 목록
 * @returns 3일 이내 편집한 문서들
 */
export function filterRecentEditsBy3Days(files: readonly RecentFile[]): RecentFile[] {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  return files.filter((file) => {
    // 파일의 시간 정보 파싱
    const fileTime = parseTimeString(file.time);
    
    // fileTime이 3일 이내인지 확인
    return fileTime >= threeDaysAgo;
  });
}

/**
 * 시간 문자열을 Date로 변환
 * @param timeStr - "방금 전", "5분 전", "1시간 전", "2024-11-15" 등의 형식
 * @returns Date 객체
 */
function parseTimeString(timeStr: string): Date {
  const now = new Date();

  // "방금 전" 패턴
  if (timeStr === '방금 전') {
    return now;
  }

  // "N분 전" 패턴
  const minuteMatch = timeStr.match(/(\d+)분 전/);
  if (minuteMatch && minuteMatch[1]) {
    const minutes = parseInt(minuteMatch[1], 10);
    return new Date(now.getTime() - minutes * 60 * 1000);
  }

  // "N시간 전" 패턴
  const hourMatch = timeStr.match(/(\d+)시간 전/);
  if (hourMatch && hourMatch[1]) {
    const hours = parseInt(hourMatch[1], 10);
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }

  // "N일 전" 패턴
  const dayMatch = timeStr.match(/(\d+)일 전/);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // ISO 날짜 형식 또는 다른 형식 - 3일 전으로 보수적 처리
  try {
    const parsedDate = new Date(timeStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch {
    // 파싱 실패 시 무시
  }

  // 파싱 실패 시 현재 시간 반환 (필터에 포함되도록)
  return now;
}
