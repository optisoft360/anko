import React, { useEffect, useState, useCallback } from "react";
import { AppPagination } from "@/components/AppPagination";
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { useMaterialTailwindController } from "@/context";

/* ── Design tokens ── */
const INPUT = {
  width: "100%", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  borderRadius: 10, padding: "10px 13px", fontSize: 13, color: "var(--lt-f1f5f9, #F1F5F9)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
};
const TEXTAREA = { ...INPUT, resize: "vertical", minHeight: 80 };
const SELECT_S = {
  ...INPUT, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2364748B' viewBox='0 0 20 20'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: 16, paddingRight: 36,
};
const LBL = { fontSize: 11, fontWeight: 700, color: "var(--lt-94a3b8, #94A3B8)", display: "block", marginBottom: 5, letterSpacing: "0.03em" };
const focusIn  = (e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; };
const focusOut = (e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; };

function Spin({ size = 18 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))", borderTopColor: "#818CF8", flexShrink: 0 }} className="animate-spin" />;
}

export function GlobalCrudPage({ title, resource, columns, fields, extraParams = {}, extraActions = null, editTitle, createTitle, disableCreate = false }) {
  const languageContext = useLanguage();
  if (!languageContext) return <div style={{ padding: 16, color: "var(--lt-f87171, #F87171)" }}>Error: Language Context is null.</div>;

  const { t } = languageContext;
  const [controller] = useMaterialTailwindController();
  void controller;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectOptions, setSelectOptions] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectService.getList(resource, { ...extraParams, page, page_size: pageSize });
      if (Array.isArray(data)) {
        setItems(data); setTotalCount(data.length);
      } else if (data && Array.isArray(data.results)) {
        setItems(data.results); setTotalCount(data.count ?? data.results.length);
      } else {
        setItems([]); setTotalCount(0);
      }
    } catch (error) {
      console.error(`Failed to fetch ${resource}`, error);
      setItems([]); setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [resource, page, pageSize]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchSelectOptions(); }, [resource]);

  const fetchSelectOptions = async () => {
    const selectFields = fields.filter((f) => f.type === "select-resource");
    const options = {};
    await Promise.all(selectFields.map(async (field) => {
      try {
        if (field.resource) {
          const data = await projectService.getList(field.resource);
          options[field.name] = Array.isArray(data) ? data : (data?.results || []);
        }
      } catch { options[field.name] = []; }
    }));
    setSelectOptions(options);
  };

  const handleOpenDialog = (item = null) => {
    setCurrentItem(item);
    if (item) {
      const initialData = { ...item };
      fields.forEach(f => {
        if (f.type === "select-resource" && f.multiple && Array.isArray(initialData[f.name])) {
          initialData[f.name] = initialData[f.name].map(val =>
            (typeof val === "object" && val !== null) ? val[f.valueAccessor || "id"] : val
          );
        }
      });
      setFormData(initialData);
    } else {
      const initial = {};
      fields.forEach((f) => {
        if (f.defaultValue !== undefined) initial[f.name] = f.defaultValue;
        else if (f.type === "boolean") initial[f.name] = false;
        else if (f.multiple) initial[f.name] = [];
        else initial[f.name] = "";
      });
      setFormData(initial);
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (currentItem) {
        const updatePayload = {};
        Object.keys(formData).forEach(key => {
          const fieldConfig = fields.find(f => f.name === key);
          if (!fieldConfig || !fieldConfig.excludeOnUpdate) updatePayload[key] = formData[key];
        });
        await projectService.updateItem(resource, currentItem.id, updatePayload);
      } else {
        await projectService.createItem(resource, formData);
      }
      setOpenDialog(false);
      fetchItems();
    } catch (error) {
      console.error("Failed to save item", error);
      let msg = error.detail || error.message || JSON.stringify(error);
      if (error.response?.data) msg = JSON.stringify(error.response.data);
      alert(`Error saving item: ${msg}`);
    }
  };

  const handleDelete = async () => {
    try {
      if (currentItem) {
        await projectService.deleteItem(resource, currentItem.id);
        setOpenDeleteDialog(false);
        fetchItems();
      }
    } catch (error) {
      console.error("Failed to delete item", error);
    }
  };

  const handleChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const getCellValue = (item, accessor) => typeof accessor === "function" ? accessor(item) : item[accessor];

  const renderField = (field) => {
    if (field.type === "select-resource") {
      const opts = selectOptions[field.name] || [];
      const labelKey = field.labelAccessor || "name";
      const valueKey = field.valueAccessor || "id";

      if (field.multiple) {
        return (
          <div key={field.name} style={{ border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 10, padding: "10px 12px" }}>
            <label style={LBL}>{field.label}</label>
            <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {opts.map(opt => {
                const val = opt[valueKey];
                const currentVals = Array.isArray(formData[field.name]) ? formData[field.name] : [];
                const isChecked = currentVals.some(v => String(v) === String(val));
                return (
                  <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={isChecked}
                      onChange={(e) => {
                        const newVals = e.target.checked ? [...currentVals, val] : currentVals.filter(v => String(v) !== String(val));
                        handleChange(field.name, newVals);
                      }}
                      style={{ width: 14, height: 14, accentColor: "#6366F1", cursor: "pointer" }} />
                    <span style={{ fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)" }}>
                      {typeof labelKey === "function" ? labelKey(opt) : (opt[labelKey] || opt.title || opt.email || "Unknown")}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div key={field.name}>
          <label style={LBL}>{field.label}</label>
          <select style={SELECT_S} value={String(formData[field.name] || "")} onChange={(e) => handleChange(field.name, e.target.value)}
            onFocus={focusIn} onBlur={focusOut}>
            <option value="" style={{ background: "var(--lt-0f172a, #0F172A)" }}>{t("global.crud.select")} {field.label}</option>
            {opts.map(opt => (
              <option key={opt[valueKey]} value={String(opt[valueKey])} style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>
                {typeof labelKey === "function" ? labelKey(opt) : (opt[labelKey] || opt.title || opt.email || "Unknown")}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.name}>
          <label style={LBL}>{field.label}</label>
          <select style={SELECT_S} value={String(formData[field.name] || "")} onChange={(e) => handleChange(field.name, e.target.value)}
            onFocus={focusIn} onBlur={focusOut}>
            <option value="" style={{ background: "var(--lt-0f172a, #0F172A)" }}>{t("global.crud.select")} {field.label}</option>
            {(field.options || []).map(opt => (
              <option key={opt.value} value={String(opt.value)} style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.name}>
          <label style={LBL}>{field.label}</label>
          <textarea style={TEXTAREA} value={formData[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)}
            onFocus={focusIn} onBlur={focusOut} />
        </div>
      );
    }

    if (field.type === "boolean") {
      return (
        <label key={field.name} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={!!formData[field.name]} onChange={(e) => handleChange(field.name, e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "pointer" }} />
          <span style={{ fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)", fontWeight: 600 }}>{field.label}</span>
        </label>
      );
    }

    return (
      <div key={field.name}>
        <label style={LBL}>{field.label}</label>
        <input type={field.type || "text"} style={INPUT} value={formData[field.name] || ""} onChange={(e) => handleChange(field.name, e.target.value)}
          onFocus={focusIn} onBlur={focusOut} />
      </div>
    );
  };

  return (
    <div style={{ marginTop: 48, display: "flex", flexDirection: "column" }}>

      {/* ── Main Table Card ── */}
      <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px var(--lt-rgba-0-0-0-0-4, rgba(0,0,0,0.4))" }}>

        {/* Accent strip */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{title}</p>
          {!disableCreate && (
            <button onClick={() => handleOpenDialog()}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(99,102,241,0.35), inset 0 1px 0 var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"; }}>
              <PlusIcon style={{ width: 14, height: 14 }} />
              {t("global.crud.add_new")}
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))" }}>
                {columns.map((col) => (
                  <th key={col.header} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                    {col.header}
                  </th>
                ))}
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {t("global.crud.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: "48px 0", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <Spin size={20} />
                      <span style={{ fontSize: 12, color: "var(--lt-475569, #475569)" }}>Cargando...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.map((item, key) => (
                <tr key={item.id || key}
                  style={{ borderBottom: key < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  {columns.map((col) => (
                    <td key={col.header} style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "var(--lt-94a3b8, #94A3B8)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getCellValue(item, col.accessor)}
                    </td>
                  ))}
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => handleOpenDialog(item)}
                        title="Edit"
                        style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#818CF8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                        <PencilIcon style={{ width: 14, height: 14 }} />
                      </button>
                      {extraActions && extraActions(item)}
                      <button onClick={() => { setCurrentItem(item); setOpenDeleteDialog(true); }}
                        title="Delete"
                        style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#F87171"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                        <TrashIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--lt-475569, #475569)" }}>
                    {t("global.crud.no_items")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {/* bottom-14 on mobile clears the fixed MobileTabBar (56px, z-[9000]) below
          md; left-0 there too since the sidebar is off-canvas on mobile. */}
      <div className="fixed bottom-14 right-0 left-0 md:bottom-0 md:left-[var(--sidebar-w)] px-4 py-2.5 md:pr-[88px] md:pl-8 md:py-2.5"
        style={{ zIndex: 30, background: "var(--lt-footer, rgba(6,13,26,0.92))", backdropFilter: "blur(12px)", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", transition: "left 0.3s" }}>
        <AppPagination
          page={page} pageSize={pageSize} totalCount={totalCount}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(Number(s)); setPage(1); }}
          disabled={loading}
        />
      </div>

      {/* ── Edit / Create Modal ── */}
      {openDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--lt-rgba-0-0-0-0-78, rgba(0,0,0,0.78))", backdropFilter: "blur(5px)" }}
          onClick={() => setOpenDialog(false)}>
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>
                {currentItem ? (editTitle || t("global.crud.edit_item")) : (createTitle || t("global.crud.create_item"))}
              </p>
              <button onClick={() => setOpenDialog(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 4, borderRadius: 6, display: "flex", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#94A3B8"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {fields.map(renderField)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
              <button onClick={() => setOpenDialog(false)}
                style={{ padding: "9px 18px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94A3B8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#64748B"; }}>
                {t("global.crud.cancel")}
              </button>
              <button onClick={handleSave}
                style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(99,102,241,0.35), inset 0 1px 0 var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"; }}>
                {t("global.crud.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {openDeleteDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--lt-rgba-0-0-0-0-78, rgba(0,0,0,0.78))", backdropFilter: "blur(5px)" }}
          onClick={() => setOpenDeleteDialog(false)}>
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, #F87171)" }} />
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrashIcon style={{ width: 18, height: 18, color: "var(--lt-f87171, #F87171)" }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>{t("global.crud.delete_title")}</p>
              </div>
              <p style={{ fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)", lineHeight: 1.6 }}>{t("global.crud.delete_message")}</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 24px 20px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
              <button onClick={() => setOpenDeleteDialog(false)}
                style={{ padding: "9px 18px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {t("global.crud.cancel")}
              </button>
              <button onClick={handleDelete}
                style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #EF4444, #F87171)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(239,68,68,0.35)" }}>
                {t("global.crud.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalCrudPage;
