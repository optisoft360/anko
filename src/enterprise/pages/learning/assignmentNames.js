import { learningApi } from "../../api/enterpriseApi";

// Single-process assignments have no learning path, so the list APIs send no name for
// them: fill in `learning_module_name` from their module (the process). Failed lookups
// leave the assignment as it was.
export async function withModuleNames(list) {
  const ids = [...new Set(list.filter((a) => !a.learning_path_name && a.learning_module).map((a) => a.learning_module))];
  if (!ids.length) return list;
  const mods = await Promise.allSettled(ids.map((id) => learningApi.getModule(id)));
  const names = {};
  mods.forEach((r, i) => { if (r.status === "fulfilled" && r.value?.name) names[ids[i]] = r.value.name; });
  return list.map((a) => (!a.learning_path_name && names[a.learning_module] ? { ...a, learning_module_name: names[a.learning_module] } : a));
}
