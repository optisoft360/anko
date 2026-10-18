import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { teamsApi } from "../api/enterpriseApi";

/**
 * F-11: the team being reported on lives in the URL (?team=ID) so it survives
 * reloads and can be shared. Picks the first team when none is set.
 * Returns { teams, teamId, setTeamId, loading, error }.
 */
export function useTeamParam() {
  const [params, setParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const teamId = params.get("team") || "";

  const setTeamId = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("team", String(id)); else next.delete("team");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    let alive = true;
    teamsApi.list()
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setTeams(list);
        if (!teamId && list.length > 0) setTeamId(list[0].id);
      })
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { teams, teamId, setTeamId, loading, error };
}

export function TeamSelect({ teams, value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
      >
        {teams.map((tm) => <option key={tm.id} value={String(tm.id)}>{tm.name}</option>)}
      </select>
    </label>
  );
}
