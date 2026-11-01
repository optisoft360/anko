import projectService from "@/services/projectService";
import { normalizeList } from "./format";

const PAGE = 200; // backend max_page_size

/**
 * Every row of a paginated admin endpoint (select options must never stop at the first page —
 * that is how the role editor used to show 10 of 124 permissions).
 */
export async function fetchAll(resource, params = {}, { maxPages = 25 } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await projectService.getList(resource, { ...params, page, page_size: PAGE });
    const { rows: chunk, count } = normalizeList(data);
    rows.push(...chunk);
    if (Array.isArray(data) || rows.length >= count || chunk.length < PAGE) break;
  }
  return rows;
}

export default fetchAll;
