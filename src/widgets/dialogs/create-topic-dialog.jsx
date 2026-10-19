import { noWheel } from "@/utils/numberInput";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Input,
    Textarea,
    Typography,
    Checkbox,
    Accordion,
    AccordionHeader,
    AccordionBody,
    Spinner,
} from "@material-tailwind/react";
import { ChevronDownIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";

function Icon({ id, open }) {
    return (
        <ChevronDownIcon
            className={`${id === open ? "rotate-180" : ""} h-5 w-5 transition-transform text-zinc-400`}
        />
    );
}

export function CreateTopicDialog({ open, onClose, onCreate, projectId }) {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        question_count_target: 10,
        related_sections: [],
    });
    const [openAccordion, setOpenAccordion] = useState(0);
    const [scannedDocuments, setScannedDocuments] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open && projectId) {
            fetchSections();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId]);

    const fetchSections = async () => {
        try {
            setLoadingSections(true);
            const data = await projectService.getDocumentsWithSections(projectId);
            // data.documents -> [{ id, filename, sections: [{id, title}, ...] }]
            setScannedDocuments(data.documents || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSections(false);
        }
    };

    const handleOpenAccordion = (value) => setOpenAccordion(openAccordion === value ? 0 : value);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSectionToggle = (sectionId) => {
        setFormData((prev) => {
            const current = prev.related_sections;
            const updated = current.includes(sectionId)
                ? current.filter((id) => id !== sectionId)
                : [...current, sectionId];
            return { ...prev, related_sections: updated };
        });
        if (errors.sections) {
            setErrors((prev) => ({ ...prev, sections: "" }));
        }
    };

    const handleDocumentToggle = (doc) => {
        if (!doc.sections) return;

        const allSectionIds = doc.sections.map(s => s.id);
        const currentSelected = formData.related_sections;

        // Are all sections of this doc selected?
        const isAllSelected = allSectionIds.every(id => currentSelected.includes(id));

        if (isAllSelected) {
            // Unselect all
            setFormData(prev => ({
                ...prev,
                related_sections: prev.related_sections.filter(id => !allSectionIds.includes(id))
            }));
        } else {
            // Select all (union)
            const newSelection = [...new Set([...currentSelected, ...allSectionIds])];
            setFormData(prev => ({ ...prev, related_sections: newSelection }));
        }

        if (errors.sections) {
            setErrors((prev) => ({ ...prev, sections: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = language === "es" ? "El nombre del tema es obligatorio" : "Topic name is required";
        }
        if (formData.question_count_target < 1 || formData.question_count_target > 100) {
            newErrors.question_count_target = language === "es" ? "La cantidad de preguntas debe estar entre 1 y 100" : "Questions count must be between 1 and 100";
        }
        if (formData.related_sections.length === 0) {
            newErrors.sections = language === "es" ? "Debes seleccionar al menos una sección" : "At least one section must be selected";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onCreate(formData);
            resetForm();
            onClose();
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            question_count_target: 10,
            related_sections: [],
        });
        setErrors({});
        setScannedDocuments([]);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Dialog
            open={open}
            handler={handleClose}
            size="lg"
            className="bg-white shadow-2xl rounded-3xl overflow-hidden ring-1 ring-zinc-900/5"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] md:h-[80vh]">
                <DialogHeader className="relative p-0 overflow-hidden bg-zinc-50 border-b border-zinc-100">
                    <div className="px-6 py-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <BookOpenIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <Typography variant="h5" className="text-zinc-900 font-black tracking-tight">
                                {t("projects.dialogs.create_topic_title")}
                            </Typography>
                            <Typography variant="tiny" className="text-zinc-500 font-medium">
                                {language === "es" ? "Organiza tu aprendizaje por temas" : "Organize your learning by topics"}
                            </Typography>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div>
                        <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                            {language === "es" ? "Nombre del Tema" : "Topic Name"} <span className="text-red-500">*</span>
                        </Typography>
                        <Input
                            placeholder={language === "es" ? "Ej. Conceptos Básicos" : "Ex. Basic Concepts"}
                            className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            autoFocus
                            labelProps={{ className: "hidden" }}
                        />
                        {errors.name && (
                            <Typography variant="small" color="red" className="mt-1 font-medium flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-red-500" /> {errors.name}
                            </Typography>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                {language === "es" ? "Descripción (opcional)" : "Description (optional)"}
                            </Typography>
                            <Textarea
                                placeholder={language === "es" ? "De qué trata este tema..." : "What is this topic about..."}
                                className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900 min-h-[120px]"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                labelProps={{ className: "hidden" }}
                            />
                        </div>
                        <div>
                            <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                {language === "es" ? "Cantidad de Preguntas" : "Questions Count"} <span className="text-red-500">*</span>
                            </Typography>
                            <div className="relative">
                                <Input
                                    type="number" {...noWheel}
                                    className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900"
                                    name="question_count_target"
                                    value={formData.question_count_target}
                                    onChange={handleChange}
                                    error={!!errors.question_count_target}
                                    min="1"
                                    max="100"
                                    labelProps={{ className: "hidden" }}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                                    TARGET
                                </div>
                            </div>

                            <Typography variant="small" className="text-zinc-400 font-medium mt-2 text-xs leading-relaxed">
                                {language === "es"
                                    ? "Define cuántas preguntas quieres generar para este tema. Máximo 100."
                                    : "Set how many questions you want to generate for this topic. Max 100."}
                            </Typography>
                            {errors.question_count_target && (
                                <Typography variant="small" color="red" className="mt-1 font-medium">
                                    {errors.question_count_target}
                                </Typography>
                            )}
                        </div>
                    </div>

                    <div>
                        <Typography variant="h6" className="font-black text-zinc-900 mb-2 flex items-center justify-between">
                            {language === "es" ? "Seleccionar secciones de contenido" : "Select Content Sections"}
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-wide">
                                {formData.related_sections.length} {language === "es" ? "SELECCIONADAS" : "SELECTED"}
                            </span>
                        </Typography>

                        {errors.sections && (
                            <Typography variant="small" color="red" className="mb-2 font-medium">
                                {errors.sections}
                            </Typography>
                        )}

                        {loadingSections ? (
                            <div className="flex justify-center p-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <Spinner className="h-6 w-6 text-indigo-500" />
                            </div>
                        ) : scannedDocuments.length === 0 ? (
                            <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                                <Typography variant="small" className="text-zinc-500 font-medium">
                                    {language === "es"
                                        ? "No se encontraron documentos con secciones procesadas."
                                        : "No documents with processed sections found."}
                                </Typography>
                            </div>
                        ) : (
                            <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                {scannedDocuments.map((doc, index) => {
                                    const docHasSections = doc.sections && doc.sections.length > 0;
                                    if (!docHasSections) return null;

                                    const allSelected = doc.sections.every(s =>
                                        formData.related_sections.includes(s.id)
                                    );
                                    const someSelected = doc.sections.some(s =>
                                        formData.related_sections.includes(s.id)
                                    );

                                    return (
                                        <Accordion
                                            key={doc.id}
                                            open={openAccordion === index + 1}
                                            icon={<Icon id={index + 1} open={openAccordion} />}
                                            className="border-b border-zinc-100 last:border-b-0"
                                        >
                                            <AccordionHeader
                                                onClick={() => handleOpenAccordion(index + 1)}
                                                className={`py-3 px-4 hover:bg-zinc-50 transition-colors border-b-0 ${openAccordion === index + 1 ? "bg-zinc-50" : ""}`}
                                            >
                                                <div className="flex items-center gap-3 w-full" onClick={e => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={allSelected}
                                                        indeterminate={someSelected && !allSelected}
                                                        onChange={() => handleDocumentToggle(doc)}
                                                        color="indigo"
                                                        className="h-4 w-4 rounded-md border-zinc-300 bg-white transition-all hover:scale-105 hover:before:opacity-0"
                                                        containerProps={{ className: "p-0" }}
                                                    />
                                                    <Typography className="font-bold text-sm text-zinc-900 flex-1 text-left">
                                                        {doc.filename}
                                                    </Typography>
                                                    <Typography className="text-xs font-bold text-zinc-400 bg-white px-2 py-0.5 rounded-md border border-zinc-100">
                                                        {doc.sections.length}
                                                    </Typography>
                                                </div>
                                            </AccordionHeader>
                                            <AccordionBody className="py-2 px-4 bg-zinc-50/50">
                                                <div className="flex flex-col gap-2 pl-7">
                                                    {doc.sections.map(section => (
                                                        <div key={section.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm hover:border-zinc-200 border border-transparent transition-all cursor-pointer" onClick={() => handleSectionToggle(section.id)}>
                                                            <Checkbox
                                                                checked={formData.related_sections.includes(section.id)}
                                                                onChange={() => { }} // handled by parent click
                                                                color="indigo"
                                                                className="h-4 w-4 rounded-md border-zinc-300"
                                                                containerProps={{ className: "p-0 mt-0.5" }}
                                                                ripple={false}
                                                            />
                                                            <div className="w-full">
                                                                <Typography variant="small" className="font-bold text-zinc-700 text-xs mb-0.5">
                                                                    {section.title || (language === "es" ? "Sección sin título" : "Untitled Section")}
                                                                </Typography>
                                                                <Typography className="text-zinc-500 text-[10px] line-clamp-2 leading-tight">
                                                                    {section.content}
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionBody>
                                        </Accordion>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogBody>

                <DialogFooter className="bg-zinc-50/50 border-t border-zinc-100 p-4 flex justify-end gap-3">
                    <Button
                        variant="text"
                        color="blue-gray"
                        onClick={handleClose}
                        className="normal-case font-bold text-zinc-600 hover:bg-zinc-200/50"
                    >
                        {t("projects.dialogs.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        variant="gradient"
                        color="indigo"
                        disabled={loadingSections}
                        className="normal-case font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        {t("projects.dialogs.create")}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}

CreateTopicDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onCreate: PropTypes.func.isRequired,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CreateTopicDialog;
