import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import FieldsPanel from "./components/FieldsPanel.jsx";
import MapView from "./components/MapView.jsx";
import FieldDetailsPage from "./components/FieldDetailsPage.jsx";
import IndexViewer from "./components/IndexViewer.jsx";
import AIReportPage from "./components/AIReportPage.jsx";

const FIELDS_STORAGE_KEY = "bidai.fields.v1";
const DEFAULT_CENTER = [53.2415, 50.2211];
const LEGACY_FIELD_IDS = new Set(["f1", "f2", "f3"]);

export default function App() {
  const fields = useMemo(() => [], []);
  const [fieldsState, setFieldsState] = useState(() => {
    try {
      const saved = localStorage.getItem(FIELDS_STORAGE_KEY);
      if (!saved) return fields;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.length) return fields;
      return parsed.filter((field) => !LEGACY_FIELD_IDS.has(field?.id));
    } catch {
      return fields;
    }
  });
  const [selectedField, setSelectedField] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [indexViewerOpen, setIndexViewerOpen] = useState(false);
  const [viewerField, setViewerField] = useState(null);
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [aiReportRequest, setAiReportRequest] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(fieldsState));
    } catch {
      // Ignore storage write errors (private mode, quota exceeded, etc.)
    }
  }, [fieldsState]);

  useEffect(() => {
    if (!selectedField && indexViewerOpen) {
      setIndexViewerOpen(false);
      setViewerField(null);
    }
  }, [selectedField, indexViewerOpen]);

  return (
    <div className="h-screen w-full overflow-hidden text-[#1f2b24]">
      <Sidebar />

      <div className="grid h-[calc(100vh-92px)] grid-cols-[minmax(0,1fr)_392px] gap-3 px-3 pb-3 pt-2">
        <main className="glass-panel min-w-0 overflow-hidden rounded-3xl border-[#d3cdb9] bg-[#f7f3e7]/86">
          {selectedField ? (
            <FieldDetailsPage
              field={selectedField}
              onClose={() => setSelectedField(null)}
              onDeleteField={(fieldId) => {
                setFieldsState((prev) => prev.filter((item) => item.id !== fieldId));
                setSelectedField((prev) => (prev?.id === fieldId ? null : prev));
                setViewerField((prev) => (prev?.id === fieldId ? null : prev));
                setIndexViewerOpen(false);
              }}
              onOpenIndexViewer={() => {
                setViewerField(selectedField);
                setIndexViewerOpen(true);
              }}
            />
          ) : (
            <MapView
              center={fieldsState[0]?.center ?? DEFAULT_CENTER}
              selectedField={null}
              fields={fieldsState}
              setFields={setFieldsState}
              setSelectedField={setSelectedField}
              drawMode={drawMode}
              setDrawMode={setDrawMode}
              onOpenAIReport={(request) => {
                setAiReportRequest(request);
                setAiReportOpen(true);
              }}
            />
          )}
        </main>

        <FieldsPanel
          fields={fieldsState}
          selectedId={selectedField?.id}
          onSelectField={setSelectedField}
          onAddField={() => setDrawMode(true)}
        />
      </div>

      {indexViewerOpen && viewerField && (
        <IndexViewer
          field={viewerField}
          onClose={() => {
            setIndexViewerOpen(false);
            setViewerField(null);
          }}
        />
      )}

      {aiReportOpen && (
        <AIReportPage
          request={aiReportRequest}
          onClose={() => {
            setAiReportOpen(false);
            setAiReportRequest(null);
          }}
        />
      )}
    </div>
  );
}
