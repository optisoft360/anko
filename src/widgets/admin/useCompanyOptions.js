import { useEffect, useState } from "react";
import { companyApi } from "@/enterprise/api/enterpriseApi";

// One request per minute at most for every admin page that filters by company.
let cache = { at: 0, promise: null };
const TTL = 60_000;

function loadCompanies() {
  if (!cache.promise || Date.now() - cache.at > TTL) {
    cache = {
      at: Date.now(),
      promise: companyApi.myCompanies()
        .then((d) => (Array.isArray(d) ? d : d?.results || []))
        .catch(() => { cache = { at: 0, promise: null }; return []; }),
    };
  }
  return cache.promise;
}

/** [{value, label}] of every company the admin can see (platform admins: all active). */
export function useCompanyOptions({ enabled = true } = {}) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadCompanies().then((list) => {
      if (alive) setOptions(list.map((c) => ({ value: c.id ?? c.company_id, label: c.name ?? c.company_name })));
    });
    return () => { alive = false; };
  }, [enabled]);
  return options;
}

export default useCompanyOptions;
