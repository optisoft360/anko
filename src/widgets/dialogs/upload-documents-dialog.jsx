import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Typography,
} from "@material-tailwind/react";
import { useLanguage } from "@/context/language-context";
import { useJobs } from "@/context/job-context";
import { applyUploadValidation, UPLOAD_ALLOWED_FILE_TYPES, MAX_UPLOAD_BYTES, uploadHelpText } from "@/utils/fileValidation";
import { API_BASE } from "@/services/api"; // Ensure this import works

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";

export function UploadDocumentsDialog({ open, onClose, onUpload, project }) {
  const { t } = useLanguage();
  const { addJob } = useJobs();

  const tRef = React.useRef(t);
  tRef.current = t;
  const uppy = useMemo(() => {
    const u = new Uppy({
      id: 'doc-uploader',
      autoProceed: false,
      restrictions: {
        maxFileSize: MAX_UPLOAD_BYTES,
        maxNumberOfFiles: 10,
        allowedFileTypes: UPLOAD_ALLOWED_FILE_TYPES,
      },
    }).use(XHRUpload, {
      endpoint: 'placeholder',
      formData: true,
      fieldName: 'files',
      headers: {},
      bundle: false,
    });

    return applyUploadValidation(u, () => tRef.current);
  }, []);

  // Update endpoint when project changes
  useEffect(() => {
    if (project?.id) {
      uppy.getPlugin('XHRUpload').setOptions({
        endpoint: `${API_BASE}/projects/${project.id}/documents/`
      });
    }
  }, [project, uppy]);

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

    const handleUploadSuccess = (file, response) => {
      const body = response.body;
      if (body.processing) {
        body.processing.forEach(p => {
          const jobId = p.external?.job_id;
          if (jobId) {
            addJob({
              id: String(jobId),
              type: 'document',
              projectId: String(project.id),
              docId: String(p.document?.id)
            });
          }
        });
      }
      if (onUpload && project?.id) {
        onUpload(project.id, body);
      }
    };

    uppy.on('upload', handleUploadStart);
    uppy.on('upload-success', handleUploadSuccess);
    return () => {
      uppy.off('upload', handleUploadStart);
      uppy.off('upload-success', handleUploadSuccess);
    };
  }, [uppy, project?.id, onUpload, addJob]);

  // Handle upload completion
  useEffect(() => {
    const handleComplete = (result) => {
      if (result.successful.length > 0) {
        onClose();
      }
    };

    uppy.on('complete', handleComplete);
    return () => {
      uppy.off('complete', handleComplete);
    };
  }, [uppy, onClose, onUpload]);

  const handleClose = () => {
    uppy.cancelAll();
    onClose();
  };



  return (
    <Dialog open={open} handler={handleClose} size="md">
      <DialogHeader>
        <div className="flex flex-col">
          <Typography variant="h5">{t("projects.dialogs.upload_docs_title")}</Typography>
          <Typography variant="small" className="text-blue-gray-500 font-normal">
            {t("projects.dialogs.upload_docs_to")}:{" "}
            <span className="font-medium">
              {project?.title || project?.name || "Project"}
            </span>
          </Typography>
        </div>
      </DialogHeader>

      <DialogBody divider className="p-0">
        <Dashboard
          uppy={uppy}
          note={uploadHelpText(t)}
          width="100%"
          height={350}
          showProgressDetails={true}
          proudlyDisplayPoweredByUppy={false}
        />
      </DialogBody>

      <DialogFooter>
        <Button variant="text" color="blue-gray" onClick={handleClose}>
          {t("projects.dialogs.cancel")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

UploadDocumentsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func, // Make optional since we handle it internally now
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    name: PropTypes.string,
  }),
};

export default UploadDocumentsDialog;


