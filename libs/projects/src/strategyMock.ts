import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import type { IStrategyTypeOption, IStrategyPhase } from './model'

/**
 * Mock master data for strategy projects (backend-less dev/demo; VITE_USE_MOCKS).
 * Two read-only catalogues, served with the standard `{ result }` envelope:
 *  - GET /strategy-types  — the templates the wizard offers (each → ordered phase ids)
 *  - GET /strategy-phases — the phase library (the wizard's custom mode + the remote rail)
 * Content is ported verbatim from the prototype's STRATEGY_TYPES / STRATEGY_PHASE_LIB.
 */

const STRATEGY_TYPES: IStrategyTypeOption[] = [
  {
    id: 1,
    key: 'data',
    name: 'Data Strategy',
    description: 'Governance, architecture, and modernization roadmap.',
    phaseIds: ['discovery', 'vision', 'governance', 'implementation', 'signoff'],
  },
  {
    id: 2,
    key: 'cloud',
    name: 'Cloud Migration',
    description: 'Lift-and-shift, re-platform, or re-architect to cloud.',
    phaseIds: ['discovery', 'business-case', 'vision', 'risk', 'implementation', 'signoff'],
  },
  {
    id: 3,
    key: 'digital',
    name: 'Digital Transformation',
    description: 'Customer experience and business-model reinvention.',
    phaseIds: ['discovery', 'vision', 'operating-model', 'change', 'implementation', 'signoff'],
  },
  {
    id: 4,
    key: 'ai',
    name: 'AI & Analytics Strategy',
    description: 'ML/AI adoption, data platform, and analytics enablement.',
    phaseIds: ['discovery', 'vision', 'governance', 'business-case', 'implementation', 'signoff'],
  },
]

const STRATEGY_PHASES: IStrategyPhase[] = [
  {
    id: 'discovery',
    name: 'Discovery & Assessment',
    description: 'Current state: landscape, pain points, and stakeholder needs.',
    guide:
      'Upload the current-state inputs, then generate the assessment. Review any open questions the AI flags before moving on — gaps here ripple through every later phase.',
    mandatory: true,
    inputs: [
      { name: 'As-Is Architecture', mandatory: true },
      { name: 'Stakeholder Interviews', mandatory: true },
      { name: 'Data Inventory' },
    ],
    outputs: [
      { name: 'Current State Assessment', fmt: 'Standard Template' },
      { name: 'Gap Analysis Report', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'stakeholder',
    name: 'Stakeholder Alignment',
    description: 'Map stakeholders and align on goals and success criteria.',
    guide:
      'Capture who is involved and their level of influence. Use the alignment brief to confirm shared goals before committing to a direction.',
    mandatory: false,
    inputs: [{ name: 'Stakeholder Register', mandatory: true }, { name: 'RACI Matrix' }],
    outputs: [{ name: 'Alignment Brief', fmt: 'Standard Template' }],
  },
  {
    id: 'vision',
    name: 'Vision & Roadmap',
    description: 'Target state, strategic objectives, and a multi-year roadmap.',
    guide:
      'Anchor the target state in the business objectives and architecture vision. Add context to steer how ambitious the roadmap should be, then resolve scope questions before sign-off.',
    mandatory: false,
    inputs: [
      { name: 'Business Objectives Brief', mandatory: true },
      { name: 'Tech Architecture Vision', mandatory: true },
      { name: 'Competitor Benchmarks' },
      { name: 'Industry Research' },
    ],
    outputs: [
      { name: 'Strategic Vision Document', fmt: 'Standard Template' },
      { name: '3-Year Roadmap', fmt: 'Standard Template' },
      { name: 'Executive Summary', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'business-case',
    name: 'Business Case',
    description: 'Costs, benefits, ROI, and the funding rationale.',
    guide:
      'Provide the cost model and benefits register. State the ROI assumptions as context so the generated case is defensible to finance.',
    mandatory: false,
    inputs: [{ name: 'Cost Model', mandatory: true }, { name: 'Benefits Register', mandatory: true }],
    outputs: [
      { name: 'Business Case', fmt: 'Standard Template' },
      { name: 'ROI Analysis', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'governance',
    name: 'Governance Framework',
    description: 'Ownership, policies, quality standards, and compliance.',
    guide:
      'List the policies and compliance requirements in scope. Confirm which regulatory frameworks apply before generating the framework and catalogue.',
    mandatory: false,
    inputs: [
      { name: 'Policy Inventory', mandatory: true },
      { name: 'Compliance Requirements', mandatory: true },
    ],
    outputs: [
      { name: 'Governance Framework', fmt: 'Standard Template' },
      { name: 'Policy Catalogue', fmt: 'Standard Template' },
    ],
  },
  {
    id: 'operating-model',
    name: 'Operating Model',
    description: 'Org structure, roles, capabilities, ways of working.',
    guide:
      'Start from the current org chart and capability map. Decide the delivery model (in-house, outsourced, or hybrid) before generating the target operating model.',
    mandatory: false,
    inputs: [{ name: 'Current Org Chart', mandatory: true }, { name: 'Capability Map' }],
    outputs: [{ name: 'Target Operating Model', fmt: 'Standard Template' }],
  },
  {
    id: 'risk',
    name: 'Risk Assessment',
    description: 'Risks, dependencies, and mitigation strategies.',
    guide:
      'Upload the risk register, then generate the assessment and mitigation plan. Note the risk appetite as context so severities are scored consistently.',
    mandatory: false,
    inputs: [{ name: 'Risk Register', mandatory: true }],
    outputs: [
      { name: 'Risk Assessment', fmt: 'Standard Template' },
      { name: 'Mitigation Plan', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'implementation',
    name: 'Implementation Plan',
    description: 'Workstreams, resource allocation, timelines, and KPIs.',
    guide:
      'Provide the resource plan and dependency map. Flag any hard external deadlines as context, then generate the plan and KPI dashboard spec.',
    mandatory: false,
    inputs: [{ name: 'Resource Plan', mandatory: true }, { name: 'Dependency Map' }],
    outputs: [
      { name: 'Implementation Plan', fmt: 'Standard Template' },
      { name: 'KPI Dashboard Spec', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'change',
    name: 'Change Management',
    description: 'Adoption, communications, and training plan.',
    guide:
      'Upload the impact assessment, then generate the change and communications plan. Identify the audiences that need tailored messaging.',
    mandatory: false,
    inputs: [{ name: 'Impact Assessment', mandatory: true }],
    outputs: [
      { name: 'Change Plan', fmt: 'Standard Template' },
      { name: 'Comms Pack', fmt: 'Custom Format' },
    ],
  },
  {
    id: 'signoff',
    name: 'Executive Sign-off',
    description: 'Board presentation, approval workflow, and closure.',
    guide:
      'Assemble the final strategy pack and generate the board presentation. Resolve every remaining open question and confirm the approvers before marking this phase Done.',
    mandatory: true,
    inputs: [{ name: 'Final Strategy Pack', mandatory: true }],
    outputs: [
      { name: 'Board Presentation', fmt: 'Standard Template' },
      { name: 'Approval Record', fmt: 'Standard Template' },
    ],
  },
]

const envelope = (result: unknown) => ({ result })

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'strategy/strategy-types',
    handler: () => ({ data: envelope(STRATEGY_TYPES) }),
  },
  {
    method: 'GET',
    pattern: 'strategy/strategy-phases',
    handler: () => ({ data: envelope(STRATEGY_PHASES) }),
  },
]

/** Registers the strategy master-data mock routes (call once at boot; gating is `useMocks`). */
export function registerStrategyMockRoutes(): void {
  registerMockRoutes(routes)
}

/** Mock-support read accessor: the strategy phase library (e.g. for the remote rail). */
export function readMockStrategyPhases(): IStrategyPhase[] {
  return STRATEGY_PHASES
}
