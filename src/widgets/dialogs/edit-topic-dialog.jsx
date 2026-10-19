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
} from "@material-tailwind/react";
import { useLanguage } from "@/context/language-context";

export function EditTopicDialog({ open, onClose, onSave, topic, availableDocuments }) {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        question_count_target: 10,
        assignedDocuments: [],
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (topic) {
            setFormData({
                name: topic.name || "",
                description: topic.description || "",
                question_count_target: topic.question_count_target || topic.questionsCount || 10,
                assignedDocuments: topic.assignedDocuments || [],
            });
        }
    }, [topic]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === "question_count_target" ? parseInt(value, 10) || 0 : value;
        setFormData((prev) => ({ ...prev, [name]: finalValue }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleDocumentToggle = (documentId) => {
        setFormData((prev) => ({
            ...prev,
            assignedDocuments: prev.assignedDocuments.includes(documentId)
                ? prev.assignedDocuments.filter((id) => id !== documentId)
                : [...prev.assignedDocuments, documentId],
        }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = language === "es" ? "El nombre del tema es obligatorio" : "Topic name is required";
        }
        if (formData.question_count_target < 1 || formData.question_count_target > 100) {
            newErrors.question_count_target = language === "es" ? "La cantidad de preguntas debe estar entre 1 y 100" : "Questions count must be between 1 and 100";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
            setErrors({});
            onClose();
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!topic) return null;

    return (
        <Dialog open={open} handler={handleClose} size="md">
            <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <Typography variant="h5">{t("projects.dialogs.edit_topic_title")}</Typography>
                </DialogHeader>
                <DialogBody divider className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <Input
                            label={`${language === "es" ? "Nombre del Tema" : "Topic Name"} *`}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            autoFocus
                        />
                        {errors.name && (
                            <Typography variant="small" color="red" className="mt-1">
                                {errors.name}
                            </Typography>
                        )}
                    </div>

                    <div>
                        <Textarea
                            label={`${language === "es" ? "Descripción (opcional)" : "Description (optional)"}`}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div>
                        <Input
                            type="number" {...noWheel}
                            label={`${language === "es" ? "Cantidad de Preguntas" : "Questions Count"} *`}
                            name="question_count_target"
                            value={formData.question_count_target}
                            onChange={handleChange}
                            error={!!errors.question_count_target}
                            min="1"
                            max="100"
                        />
                        {errors.question_count_target && (
                            <Typography variant="small" color="red" className="mt-1">
                                {errors.question_count_target}
                            </Typography>
                        )}
                        <Typography variant="small" className="text-blue-gray-500 mt-1">
                            {language === "es" ? "Número de preguntas a generar para este tema (1-100)" : "Number of questions to generate for this topic (1-100)"}
                        </Typography>
                    </div>

                    {/* Document Assignment */}
                    {availableDocuments && availableDocuments.length > 0 && (
                        <div>
                            <Typography variant="small" className="text-blue-gray-700 font-medium mb-2">
                                {language === "es" ? "Asignar Documentos" : "Assign Documents"}
                            </Typography>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-blue-gray-200 rounded-lg p-3">
                                {availableDocuments.map((doc) => (
                                    <Checkbox
                                        key={doc.id}
                                        label={
                                            <Typography variant="small" className="font-normal">
                                                {doc.filename}
                                            </Typography>
                                        }
                                        checked={formData.assignedDocuments.includes(doc.id)}
                                        onChange={() => handleDocumentToggle(doc.id)}
                                    />
                                ))}
                            </div>
                            <Typography variant="small" className="text-blue-gray-500 mt-1">
                                {formData.assignedDocuments.length} {language === "es" ? "documento(s) seleccionado(s)" : "document(s) selected"}
                            </Typography>
                        </div>
                    )}
                </DialogBody>
                <DialogFooter className="gap-2">
                    <Button variant="text" color="blue-gray" onClick={handleClose}>
                        {t("projects.dialogs.cancel")}
                    </Button>
                    <Button type="submit" variant="gradient" color="blue">
                        {t("projects.dialogs.save_changes")}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}

EditTopicDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    topic: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        question_count_target: PropTypes.number,
        assignedDocuments: PropTypes.arrayOf(PropTypes.string),
    }),
    availableDocuments: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            filename: PropTypes.string.isRequired,
        })
    ),
};

export default EditTopicDialog;
