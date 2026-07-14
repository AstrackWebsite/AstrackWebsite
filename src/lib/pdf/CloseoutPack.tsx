/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportSectionKey } from "@/lib/closeoutSections";
import { ALL_SECTION_KEYS } from "@/lib/closeoutSections";

export interface CloseoutData {
  companyName: string;
  reportKind: string;
  generatedAt: string;
  /** Which sections to include. Absent = all (back-compat with the full pack). */
  sections?: ReportSectionKey[];
  /** Optional audience note shown under the title, e.g. "Client copy". */
  audienceNote?: string;
  project: {
    reference: string;
    address: string;
    classification: string;
    status: string;
    start: string;
    end: string;
    asb5: string | null;
    notificationForm: string;
    contractValue: string;
    cm: string;
    supervisor: string;
  };
  client: { name: string; contact: string; email: string } | null;
  handover: { label: string; done: boolean }[];
  handoverDocs: { type: string; title: string | null }[];
  register: { name: string; date: string; inOut: string; status: string }[];
  rpe: { name: string; date: string; rpe: string; inspected: string; faceFit: string }[];
  exposure: { name: string; date: string; task: string; detail: string; twa: string }[];
  plantChecks: { asset: string; date: string; kind: string }[];
  air: { type: string; result: string; status: string; date: string }[];
  rating: string;
  comments: string;
}

const NAVY = "#1a3a5c";
const MUTED = "#5b6b7d";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: "#0f2338", fontFamily: "Helvetica" },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  docTitle: { fontSize: 10, color: MUTED },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 2 },
  sub: { fontSize: 9, color: MUTED, marginBottom: 10 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY,
    borderBottomWidth: 1, borderBottomColor: NAVY, paddingBottom: 3, marginBottom: 6,
  },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "50%", marginBottom: 4 },
  metaLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  metaValue: { fontSize: 9 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 3 },
  headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: MUTED, paddingBottom: 3, marginBottom: 2 },
  cell: { flex: 1, paddingRight: 4 },
  cellHead: { flex: 1, paddingRight: 4, fontFamily: "Helvetica-Bold", fontSize: 8, color: MUTED },
  tick: { fontFamily: "Helvetica-Bold" },
  empty: { fontSize: 8, color: MUTED, fontStyle: "italic" },
  footer: {
    position: "absolute", bottom: 20, left: 32, right: 32,
    fontSize: 7, color: MUTED, textAlign: "center",
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6,
  },
});

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  return (
    <View>
      <View style={s.headRow}>
        {head.map((h, i) => (
          <Text key={i} style={s.cellHead}>{h}</Text>
        ))}
      </View>
      {rows.length === 0 && <Text style={s.empty}>No records.</Text>}
      {rows.map((r, i) => (
        <View key={i} style={s.row}>
          {r.map((c, j) => (
            <Text key={j} style={s.cell}>{c}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function CloseoutPack({ data }: { data: CloseoutData }) {
  const p = data.project;
  const sections = data.sections ?? ALL_SECTION_KEYS;
  const has = (k: ReportSectionKey) => sections.includes(k);
  return (
    <Document title={`${data.reportKind} — ${p.reference}`}>
      <Page size="A4" style={s.page}>
        <View style={s.brandRow}>
          <Text style={s.brand}>{data.companyName}</Text>
          <Text style={s.docTitle}>{data.reportKind}</Text>
        </View>
        <Text style={s.h1}>{p.address}</Text>
        <Text style={s.sub}>
          {p.reference} · {p.classification} · Generated {data.generatedAt}
          {data.audienceNote ? ` · ${data.audienceNote}` : ""}
        </Text>

        {/* Project details */}
        {has("details") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Project</Text>
            <View style={s.metaGrid}>
              <Meta label="Status" value={p.status} />
              <Meta label="Contract value" value={p.contractValue} />
              <Meta label="Contracts manager" value={p.cm} />
              <Meta label="Supervisor" value={p.supervisor} />
              <Meta label="Start" value={p.start} />
              <Meta label="End" value={p.end} />
              {p.asb5 && <Meta label={`${p.notificationForm} notified`} value={p.asb5} />}
              <Meta label="Client" value={data.client?.name ?? "—"} />
            </View>
          </View>
        )}

        {/* Analyst handover */}
        {has("handover") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Analyst Handover</Text>
            {data.handover.map((h, i) => (
              <View key={i} style={s.row}>
                <Text style={[s.cell, s.tick]}>{h.done ? "[x]" : "[ ]"}</Text>
                <Text style={{ flex: 6 }}>{h.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Handover documents on file */}
        {has("documents") && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Handover Documents on File</Text>
            {data.handoverDocs.length === 0 && (
              <Text style={s.empty}>No handover documents attached.</Text>
            )}
            {data.handoverDocs.map((d, i) => (
              <View key={i} style={s.row}>
                <Text style={{ flex: 3, fontFamily: "Helvetica-Bold" }}>{d.type}</Text>
                <Text style={{ flex: 4 }}>{d.title ?? ""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Site register */}
        {has("register") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Site Register</Text>
            <Table
              head={["Name", "Date", "In / Out", "Status"]}
              rows={data.register.map((r) => [r.name, r.date, r.inOut, r.status])}
            />
          </View>
        )}

        {/* RPE inspection records */}
        {has("rpe") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>RPE Inspection Records</Text>
            <Table
              head={["Operative", "Date", "RPE worn", "Inspected", "Face-fit"]}
              rows={data.rpe.map((r) => [r.name, r.date, r.rpe, r.inspected, r.faceFit])}
            />
          </View>
        )}

        {/* Exposure */}
        {has("exposure") && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Personal Exposure (4-hour TWA)</Text>
            <Table
              head={["Operative", "Date", "Task", "Detail", "4h TWA"]}
              rows={data.exposure.map((e) => [e.name, e.date, e.task, e.detail, e.twa])}
            />
          </View>
        )}

        {/* Plant checks */}
        {has("plant") && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Plant Checks</Text>
            <Table
              head={["Asset", "Date", "Check"]}
              rows={data.plantChecks.map((c) => [c.asset, c.date, c.kind])}
            />
          </View>
        )}

        {/* Air monitoring */}
        {has("air") && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Air Monitoring</Text>
            <Table
              head={["Type", "Result", "Outcome", "Date"]}
              rows={data.air.map((a) => [a.type, a.result, a.status, a.date])}
            />
          </View>
        )}

        {/* Client satisfaction */}
        {has("feedback") && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Client Satisfaction</Text>
            <Meta label="Rating" value={data.rating} />
            {data.comments ? <Meta label="Comments" value={data.comments} /> : null}
          </View>
        )}

        <Text style={s.footer} fixed>
          {data.companyName} · Compliance record retained under CAR 2012 Reg 19 ·
          Auditable snapshot generated {data.generatedAt} · Produced with AsTrack
        </Text>
      </Page>
    </Document>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}
