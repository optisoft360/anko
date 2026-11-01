import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import projectService from "@/services/projectService";
import { useAuth } from "./auth-context";

const ProjectsContext = createContext();

export function ProjectsProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [rules, setRules] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to load all data
  const refreshAll = useCallback(async () => {
    if (!user?.id) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [projectsData, topicsData, rulesData, batteriesData] = await Promise.all([
        projectService.getProjects({ user: user.id }),
        projectService.getTopics(),
        projectService.getAllRules(),
        projectService.getAllBatteries()
      ]);

      // Handle array or paginated response for projects
      const projectList = Array.isArray(projectsData) ? projectsData : (projectsData.results || []);
      setProjects(projectList);

      setTopics(Array.isArray(topicsData) ? topicsData : (topicsData.results || []));
      setRules(Array.isArray(rulesData) ? rulesData : (rulesData.results || []));
      setBatteries(Array.isArray(batteriesData) ? batteriesData : (batteriesData.results || []));

      setError(null);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Lazy load: nothing is fetched until a page that uses the data mounts (useProjects()).
  // Loading projects/topics/rules/batteries on every route — admin and enterprise included —
  // spent the per-minute request quota and triggered 429s.
  const [wanted, setWanted] = useState(false);
  const request = useCallback(() => setWanted(true), []);

  useEffect(() => {
    if (wanted) refreshAll();
  }, [wanted, refreshAll]);

  // ===== PROJECT FUNCTIONS =====
  // These wrappers ensure we update the global state after actions

  const createProject = async (projectData, files = []) => {
    try {
      const newProject = await projectService.createProject(projectData, null, files);
      await refreshAll(); // Sync everything
      return newProject;
    } catch (err) {
      console.error("Context createProject error:", err);
      throw err;
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      // Optimistic update or refresh
      setProjects(prev => prev.filter(p => p.id !== projectId));
      await refreshAll(); // Ensure consistency
    } catch (err) {
      throw err;
    }
  };

  // Keep these mostly compatible with the old context structure if they were used directly
  // But now they should probably delegate to projectService if logic is complex

  // Minimal value object export
  const value = {
    projects,
    topics,
    rules,
    batteries,
    loading,
    error,
    refreshAll,
    request,
    createProject,
    deleteProject,
    // Add other wrappers as needed by components, or let components call service directly + refreshAll
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

ProjectsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Pages using the data load it on mount. `{ passive: true }` reads whatever is loaded without
 * triggering a fetch (the navbar on routes that don't need projects).
 */
export const useProjects = ({ passive = false } = {}) => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  const { request } = context;
  useEffect(() => {
    if (!passive) request();
  }, [passive, request]);
  return context;
};

export default ProjectsContext;
