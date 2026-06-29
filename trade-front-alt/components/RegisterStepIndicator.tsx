'use client';

interface Step {
  id: number;
  label: string;
  shortLabel: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
}

export function RegisterStepIndicator({ steps, currentStep }: Props) {
  const progress =
    steps.length <= 1 ? 100 : (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="register-steps mb-8">
      <div className="register-steps-track" aria-hidden>
        <div
          className="register-steps-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="register-steps-row" role="list" aria-label="Kayıt adımları">
        {steps.map((step) => {
          const done = step.id < currentStep;
          const current = step.id === currentStep;
          const state = done ? 'done' : current ? 'current' : 'upcoming';

          return (
            <div
              key={step.id}
              role="listitem"
              aria-current={current ? 'step' : undefined}
              className={`register-steps-item register-steps-item--${state}`}
            >
              <span className="register-steps-dot" aria-hidden>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.id + 1
                )}
              </span>
              <span className="register-steps-label hidden min-[400px]:block">
                {step.shortLabel}
              </span>
              {current && (
                <span className="register-steps-label min-[400px]:hidden">
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
