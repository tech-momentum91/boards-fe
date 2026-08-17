import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import {
  createProjectBoqChild,
  fetchProjectBoq,
  fetchProjectBoqChild,
  fetchProjectBoqTemplateOptions,
} from '@/api/projectBoqs';
import ProjectBoqDetailView from '@/components/boq/project-boqs/components/project-boq-detail-view';
import CreateProjectBoqModal from '@/components/boq/project-boqs/components/create-project-boq-modal';
import {
  buildProjectBoqFamilyBadgeMembers,
  buildProjectBoqCreatePayload,
  normalizeProjectBoqRow,
} from '@/components/boq/boq-helper';
import { PROJECT_BOQ_TYPES } from '@/components/boq/constants';
import PageLayout from '@/components/page-layout';
import { setDevxAiChatOpen } from '@/redux/uiSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const resolveActiveChildCode = (familyData, requestedCode, children) => {
  const childCodes = new Set(children.map((child) => child.code || child.id));
  if (requestedCode && (childCodes.has(requestedCode) || requestedCode.includes('-v'))) {
    return requestedCode;
  }

  const activeFromApi = familyData?.activeBoq;
  if (activeFromApi && childCodes.has(activeFromApi)) {
    return activeFromApi;
  }

  const mainChild = children.find((child) => child.boqType === 'main');
  return mainChild?.code || mainChild?.id || children[0]?.code || children[0]?.id || '';
};

const applyFamilyPayload = (data, requestedCode) => {
  const children = Array.isArray(data?.children)
    ? buildProjectBoqFamilyBadgeMembers(data.children.map(normalizeProjectBoqRow))
    : [];
  const nextActiveCode = resolveActiveChildCode(data, requestedCode, children);
  const activeChild =
    children.find((child) => (child.code || child.id) === nextActiveCode) || children[0];

  return {
    familyMeta: normalizeProjectBoqRow(data),
    familyRows: children,
    boqRow: activeChild ? normalizeProjectBoqRow(activeChild) : null,
  };
};

const routeMatchesLoadedFamily = (requestedCode, familyMeta, familyRows, boqRow) => {
  if (!requestedCode || !familyMeta) return false;

  const familyCode = familyMeta.code || familyMeta.id || '';
  if (requestedCode === familyCode) {
    return Boolean(boqRow);
  }

  if (familyRows.some((row) => (row.code || row.id) === requestedCode)) {
    return (boqRow?.code || boqRow?.id) === requestedCode;
  }

  return (boqRow?.code || boqRow?.id) === requestedCode;
};

export default function ProjectBoqDetailPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { boqId } = useParams();
  const decodedBoqId = decodeURIComponent(boqId ?? '');
  const [boqRow, setBoqRow] = useState(null);
  const [familyRows, setFamilyRows] = useState([]);
  const [familyMeta, setFamilyMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createBoqType, setCreateBoqType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const familyRequestIdRef = useRef(0);

  const loadFamily = useCallback(
    async (requestedCode = decodedBoqId) => {
      const data = await fetchProjectBoq(requestedCode);
      return applyFamilyPayload(data, requestedCode);
    },
    [decodedBoqId],
  );

  useEffect(() => {
    if (!decodedBoqId) {
      setIsLoading(false);
      return undefined;
    }

    if (routeMatchesLoadedFamily(decodedBoqId, familyMeta, familyRows, boqRow)) {
      setIsLoading(false);
      return undefined;
    }

    const requestId = familyRequestIdRef.current + 1;
    familyRequestIdRef.current = requestId;
    setIsLoading(true);

    loadFamily(decodedBoqId)
      .then((next) => {
        if (familyRequestIdRef.current !== requestId) return;
        setFamilyMeta(next.familyMeta);
        setFamilyRows(next.familyRows);
        setBoqRow(next.boqRow);
      })
      .catch((error) => {
        if (familyRequestIdRef.current !== requestId) return;
        setBoqRow(null);
        setFamilyRows([]);
        setFamilyMeta(null);
        showErrorToast(error, { defaultMessage: 'Failed to load Project BOQ family.' });
        navigate('/boq/project-boqs', { replace: true });
      })
      .finally(() => {
        if (familyRequestIdRef.current === requestId) setIsLoading(false);
      });

    return () => {
      if (familyRequestIdRef.current === requestId) {
        familyRequestIdRef.current += 1;
      }
    };
  }, [decodedBoqId, familyMeta, familyRows, boqRow, loadFamily, navigate]);

  useEffect(() => {
    if (!isCreateModalOpen) return undefined;

    let cancelled = false;
    fetchProjectBoqTemplateOptions()
      .then((templates) => {
        if (!cancelled) setTemplateOptions(templates);
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(error, { defaultMessage: 'Failed to load BOQ templates.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCreateModalOpen]);

  const handleActiveChildChange = useCallback(
    async (nextCode) => {
      if (!nextCode) return;

      const currentCode = boqRow?.code || boqRow?.id || decodedBoqId;
      if (nextCode === currentCode) return;

      const localChild = familyRows.find((row) => (row.code || row.id) === nextCode);
      if (localChild) {
        setBoqRow(normalizeProjectBoqRow(localChild));
        if (nextCode !== decodedBoqId) {
          navigate(`/boq/project-boqs/${encodeURIComponent(nextCode)}`, { replace: true });
        }
        return;
      }

      try {
        const childData = await fetchProjectBoqChild(nextCode);
        if (childData?.code || childData?.name) {
          setBoqRow(normalizeProjectBoqRow(childData));

          const familyCode = familyMeta?.code || familyMeta?.id;
          if (familyCode) {
            const familyData = await fetchProjectBoq(familyCode);
            const next = applyFamilyPayload(familyData, nextCode);
            setFamilyMeta(next.familyMeta);
            setFamilyRows(next.familyRows);
          }

          if (nextCode !== decodedBoqId) {
            navigate(`/boq/project-boqs/${encodeURIComponent(nextCode)}`, { replace: true });
          }
          return;
        }
      } catch {
        // Fall through to full navigation below.
      }

      navigate(`/boq/project-boqs/${encodeURIComponent(nextCode)}`);
    },
    [boqRow, decodedBoqId, familyMeta, familyRows, navigate],
  );

  const contextPrefill = useMemo(() => {
    const clientId = familyMeta?.clientId || boqRow?.clientId || '';
    const projectId = familyMeta?.projectId || boqRow?.projectId || '';
    return {
      client: clientId,
      project: projectId,
    };
  }, [boqRow?.clientId, boqRow?.projectId, familyMeta?.clientId, familyMeta?.projectId]);

  const clientOptions = useMemo(() => {
    const value = contextPrefill.client;
    if (!value) return [];
    return [
      {
        value,
        label: familyMeta?.client || boqRow?.client || value,
      },
    ];
  }, [boqRow?.client, contextPrefill.client, familyMeta?.client]);

  const projectOptions = useMemo(() => {
    const value = contextPrefill.project;
    if (!value) return [];
    return [
      {
        value,
        label: familyMeta?.project || boqRow?.project || value,
      },
    ];
  }, [boqRow?.project, contextPrefill.project, familyMeta?.project]);

  const handleAddBoqType = useCallback(
    (typeId) => {
      if (
        typeId !== PROJECT_BOQ_TYPES.ADDITIONAL &&
        familyRows.some((row) => row.boqType === typeId)
      ) {
        const label =
          typeId === PROJECT_BOQ_TYPES.MAIN
            ? 'Main BOQ'
            : typeId === PROJECT_BOQ_TYPES.DESIGN
              ? 'Design BOQ'
              : '';
        showErrorToast(null, { defaultMessage: `${label} already exists in this family.` });
        return;
      }

      setCreateBoqType(typeId);
      setIsCreateModalOpen(true);
    },
    [familyRows],
  );

  const handleCreateBoq = useCallback(
    async (form) => {
      const familyCode = familyMeta?.code || familyMeta?.id;
      if (!familyCode) {
        showErrorToast(null, { defaultMessage: 'BOQ family is missing.' });
        return;
      }

      setIsCreating(true);
      try {
        const result = await createProjectBoqChild(
          buildProjectBoqCreatePayload({
            ...form,
            familyId: familyCode,
          }),
        );

        setIsCreateModalOpen(false);
        setCreateBoqType('');
        showSuccessToast('Project BOQ created successfully.');

        const newCode = result?.code || result?.id;
        const next = await loadFamily(newCode || decodedBoqId);
        setFamilyMeta(next.familyMeta);
        setFamilyRows(next.familyRows);
        setBoqRow(next.boqRow);
        if (newCode && newCode !== decodedBoqId) {
          navigate(`/boq/project-boqs/${encodeURIComponent(newCode)}`, { replace: true });
        }
      } catch (error) {
        showErrorToast(error, { defaultMessage: 'Failed to create Project BOQ.' });
      } finally {
        setIsCreating(false);
      }
    },
    [decodedBoqId, familyMeta?.code, familyMeta?.id, loadFamily, navigate],
  );

  const allRows = useMemo(() => familyRows, [familyRows]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((previous) => {
      const next = !previous;
      if (next) {
        dispatch(setDevxAiChatOpen(false));
      }
      return next;
    });
  }, [dispatch]);

  useEffect(() => {
    return () => {
      setIsFullscreen(false);
    };
  }, []);

  if (!boqRow && isLoading) return null;
  if (!boqRow) return null;

  return (
    <PageLayout
      showDefaultHeader={false}
      borderDivClassName='hidden'
      contentAreaClassName='overflow-hidden'
      sidebarInitialOpen={!isFullscreen}
      showAiChatSidebar={!isFullscreen}
    >
      <ProjectBoqDetailView
        boqRow={boqRow}
        allRows={allRows}
        familyMeta={familyMeta}
        onActiveChildChange={handleActiveChildChange}
        onAddBoqType={handleAddBoqType}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <CreateProjectBoqModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setCreateBoqType('');
        }}
        onSubmit={handleCreateBoq}
        isSubmitting={isCreating}
        boqType={createBoqType}
        clientOptions={clientOptions}
        projectOptions={projectOptions}
        templateOptions={{ templateMaster: templateOptions }}
        prefill={contextPrefill}
        lockContextFields={true}
      />
    </PageLayout>
  );
}
