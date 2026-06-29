import type { WizardState, WizardAction, WizardStep } from './types';

export const initialWizardState: WizardState = {
  step: 'thesis',
  session: {
    entryId: '',
    status: 'thesis',
    thesis: '',
    questions: [],
    answers: {},
    distortions: [],
    synthesis: '',
  },
  isLoading: false,
  error: null,
};

export const stepOrder: WizardStep[] = ['thesis', 'interrogation', 'distortions', 'synthesis'];

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'RESET':
      return initialWizardState;

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.payload };

    case 'INIT_SESSION':
      return {
        ...state,
        isLoading: false,
        error: null,
        step: action.payload.status,
        session: action.payload,
      };

    case 'SET_THESIS':
      return {
        ...state,
        session: { ...state.session, thesis: action.payload },
      };

    case 'SET_ANSWER': {
      const { questionId, answer } = action.payload;
      return {
        ...state,
        session: {
          ...state.session,
          answers: { ...state.session.answers, [questionId]: answer },
        },
      };
    }

    case 'ADVANCE_TO_INTERROGATION':
      return {
        ...state,
        isLoading: false,
        error: null,
        step: 'interrogation',
        session: {
          ...state.session,
          ...action.payload,
          status: 'interrogation',
        },
      };

    case 'SET_DISTORTION': {
      const updated = state.session.distortions.map(d =>
        d.id === action.payload.id ? { ...action.payload } : d
      );
      const exists = updated.some(d => d.id === action.payload.id);
      const distortions = exists ? updated : [...updated, action.payload];
      return {
        ...state,
        session: { ...state.session, distortions },
      };
    }

    case 'ADVANCE_TO_DISTORTIONS':
      return {
        ...state,
        isLoading: false,
        error: null,
        step: 'distortions',
        session: {
          ...state.session,
          ...action.payload,
          status: 'distortions',
          questions: state.session.questions,
        },
      };

    case 'SET_SYNTHESIS':
      return {
        ...state,
        session: { ...state.session, synthesis: action.payload },
      };

    case 'COMPLETE':
      return {
        ...state,
        isLoading: false,
        error: null,
        step: 'synthesis',
        session: {
          ...state.session,
          ...action.payload,
          status: 'synthesis',
          questions: state.session.questions,
        },
      };

    case 'SET_STEP':
      return { ...state, step: action.payload };

    default:
      return state;
  }
}

export function isStepComplete(state: WizardState, step: WizardStep): boolean {
  switch (step) {
    case 'thesis':
      return state.session.thesis.trim().length >= 3;
    case 'interrogation':
      return Object.keys(state.session.answers).length >= 1;
    case 'distortions':
      return state.session.distortions.some(d => d.confidence > 0);
    case 'synthesis':
      return state.session.synthesis.trim().length >= 3;
    default:
      return false;
  }
}

export function canAdvance(state: WizardState, step: WizardStep): boolean {
  return isStepComplete(state, step);
}

export function nextStep(step: WizardStep): WizardStep | null {
  const index = stepOrder.indexOf(step);
  return index < stepOrder.length - 1 ? stepOrder[index + 1] : null;
}

export function previousStep(step: WizardStep): WizardStep | null {
  const index = stepOrder.indexOf(step);
  return index > 0 ? stepOrder[index - 1] : null;
}

export const WizardActions = {
  reset: (): WizardAction => ({ type: 'RESET' }),
  setLoading: (isLoading: boolean): WizardAction => ({ type: 'SET_LOADING', payload: isLoading }),
  setError: (error: string): WizardAction => ({ type: 'SET_ERROR', payload: error }),
  initSession: (session: WizardState['session']): WizardAction => ({
    type: 'INIT_SESSION',
    payload: session,
  }),
  setThesis: (thesis: string): WizardAction => ({ type: 'SET_THESIS', payload: thesis }),
  setAnswer: (questionId: string, answer: string): WizardAction => ({
    type: 'SET_ANSWER',
    payload: { questionId, answer },
  }),
  advanceToInterrogation: (session: WizardState['session']): WizardAction => ({
    type: 'ADVANCE_TO_INTERROGATION',
    payload: session,
  }),
  setDistortion: (distortion: WizardState['session']['distortions'][number]): WizardAction => ({
    type: 'SET_DISTORTION',
    payload: distortion,
  }),
  advanceToDistortions: (session: WizardState['session']): WizardAction => ({
    type: 'ADVANCE_TO_DISTORTIONS',
    payload: session,
  }),
  setSynthesis: (synthesis: string): WizardAction => ({ type: 'SET_SYNTHESIS', payload: synthesis }),
  complete: (session: WizardState['session']): WizardAction => ({ type: 'COMPLETE', payload: session }),
  setStep: (step: WizardStep): WizardAction => ({ type: 'SET_STEP', payload: step }),
};
