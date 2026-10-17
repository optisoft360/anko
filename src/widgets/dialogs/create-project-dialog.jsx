import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "@material-tailwind/react";
import { FolderPlusIcon } from "@heroicons/react/24/outline";
import projectService, { API_BASE } from "../../services/projectService";
import { useLanguage } from "@/context/language-context";
import { useJobs } from "@/context/job-context";
import { applyUploadValidation, UPLOAD_ALLOWED_FILE_TYPES, MAX_UPLOAD_BYTES } from "@/utils/fileValidation";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";

export function CreateProjectDialog({ open, onClose, onCreate, projects = [] }) {
  const { t, language } = useLanguage();
  const { addJob } = useJobs();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize Uppy
  const tRef = React.useRef(t);
  tRef.current = t;
  const uppy = useMemo(() => {
    return applyUploadValidation(new Uppy({
      id: 'create-project-uploader',
      autoProceed: false,
      restrictions: {
        maxFileSize: MAX_UPLOAD_BYTES,
        allowedFileTypes: UPLOAD_ALLOWED_FILE_TYPES,
      },
    }).use(XHRUpload, {
      endpoint: 'will-be-set-later', // Placeholder
      formData: true,
      fieldName: 'files',
      headers: {},
      // Bundle files in one request if backend supports it, otherwise separate requests
      // Standard local backend likely handles one-by-one or list.
      // Assuming 'files' takes multiple, bundle: true might be needed if the endpoint expects a list.
      // Checking projectService: sends FormData with multiple "files" entries.
      bundle: false,
    }), () => tRef.current);
  }, []);

  // Inject fresh token before upload starts
  useEffect(() => {
    const handleUploadStart = () => {
      const token = localStorage.getItem("token");
      if (token) {
        uppy.getPlugin('XHRUpload').setOptions({
          headers: {
            Authorization: `Token ${token}`,
          }
        });
      }
    };

    uppy.on('upload', handleUploadStart);
    return () => {
      uppy.off('upload', handleUploadStart);
    };
  }, [uppy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation for duplicate name
    if (name === "name") {
      const trimmedValue = value.trim().toLowerCase();
      const isDuplicate = projects.some(
        (p) => (p.title || p.name || "").trim().toLowerCase() === trimmedValue
      );

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          name: t("projects.dialogs.duplicate_name_error") || "You already have a project with this name.",
        }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    } else {
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const nameValue = formData.name.trim();

    if (!nameValue) {
      newErrors.name = language === "es" ? "El nombre del proyecto es obligatorio" : "Project name is required";
    } else {
      const isDuplicate = projects.some(
        (p) => (p.title || p.name || "").trim().toLowerCase() === nameValue.toLowerCase()
      );
      if (isDuplicate) {
        newErrors.name = t("projects.dialogs.duplicate_name_error") || "You already have a project with this name.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1) Create project
      const created = await projectService.createProject({
        title: formData.name,
        description: formData.description,
      });

      // Capture job IDs from successful uploads if needed
      // Actually, since uppy.upload() is called, we should listen for success
      const successHandler = (file, response) => {
        const body = response.body;
        if (body.processing) {
          body.processing.forEach(p => {
            const jobId = p.external?.job_id;
            if (jobId) {
              addJob({
                id: String(jobId),
                type: 'document',
                projectId: String(created.id),
                docId: String(p.document?.id)
              });
            }
          });
        }
      };

      uppy.on('upload-success', successHandler);

      // 2) Upload documents if any added to Uppy
      const files = uppy.getFiles();
      if (files.length > 0) {
        // Update endpoint with new project ID
        uppy.getPlugin('XHRUpload').setOptions({
          endpoint: `${API_BASE}/projects/${created.id}/documents/`
        });

        await uppy.upload();
      }

      onCreate(created);
      handleClose();

    } catch (err) {
      console.error(err);
      const msg = err?.detail || err?.error || (language === "es" ? "Error al crear el proyecto" : "Failed to create project");
      setErrors((prev) => ({ ...prev, submit: msg }));
      // If upload failed but project created, we might want to warn user, but for now just show error.
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", description: "" });
    setErrors({});
    uppy.cancelAll(); // Clear files
    onClose();
  };

  return (
    <Dialog
      open={open}
      handler={handleClose}
      size="md"
      className="bg-white shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden ring-1 ring-zinc-900/5 !mx-3 md:!mx-auto"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <DialogHeader className="relative p-0 overflow-hidden bg-zinc-50 border-b border-zinc-100">
          <div className="px-4 py-3 md:px-6 md:py-6 flex items-center gap-3">
            <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <FolderPlusIcon className="h-4 w-4 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-zinc-900 font-black tracking-tight" style={{ fontSize: "14px" }}>
                {t("projects.dialogs.create_project_title") || "Create New Project"}
              </p>
              <p className="text-zinc-500 font-medium" style={{ fontSize: "11px" }}>
                {language === "es" ? "Inicia un nuevo espacio de trabajo" : "Start a new workspace"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 p-4 md:p-6 overflow-y-auto max-h-[65vh]">
          <div>
            <p className="font-bold text-zinc-900 mb-1.5 ml-1" style={{ fontSize: "12px" }}>
              {language === "es" ? "Nombre del Proyecto" : "Project Name"} <span className="text-red-500">*</span>
            </p>
            <Input
              placeholder={language === "es" ? "Ej. Microbiología 101" : "Ex. Microbiology 101"}
              className={`!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900 transition-all ${errors.name ? "!border-red-500 shadow-sm shadow-red-500/10" : ""}`}
              value={formData.name}
              name="name"
              onChange={handleChange}
              error={!!errors.name}
              autoFocus
              labelProps={{ className: "hidden" }}
            />
            {errors.name && (
              <p className="mt-1 font-medium flex items-center gap-1 text-red-500" style={{ fontSize: "11px" }}>
                <span className="h-1 w-1 rounded-full bg-red-500 shrink-0" /> {errors.name}
              </p>
            )}
          </div>

          <div>
            <p className="font-bold text-zinc-900 mb-1.5 ml-1" style={{ fontSize: "12px" }}>
              {language === "es" ? "Descripción (opcional)" : "Description (optional)"}
            </p>
            <Textarea
              placeholder={language === "es" ? "Describe brevemente el objetivo de este proyecto..." : "Briefly describe the goal of this project..."}
              className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900 min-h-[80px] md:min-h-[100px]"
              name="description"
              value={formData.description}
              onChange={handleChange}
              labelProps={{ className: "hidden" }}
            />
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-zinc-100 p-3 md:p-4 flex items-center justify-end gap-2 bg-zinc-50/50">
          <Button
            variant="text"
            color="blue-gray"
            onClick={handleClose}
            disabled={loading}
            className="normal-case font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-xs md:text-sm px-3 py-2"
          >
            {t("projects.dialogs.cancel")}
          </Button>
          <Button
            type="submit"
            variant="gradient"
            color="indigo"
            disabled={loading}
            className="normal-case font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 text-xs md:text-sm px-4 py-2"
          >
            {loading
              ? (language === "es" ? "Creando..." : "Creating...")
              : (language === "es" ? "Crear Proyecto" : "Create Project")}
          </Button>
        </DialogFooter>

        {errors.submit && (
          <p className="px-4 pb-3 text-center font-bold text-red-500" style={{ fontSize: "11px" }}>
            {errors.submit}
          </p>
        )}
      </form>
    </Dialog>
  );
}

CreateProjectDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  projects: PropTypes.array,
};

export default CreateProjectDialog;
