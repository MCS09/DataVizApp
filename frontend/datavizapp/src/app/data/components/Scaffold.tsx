import React from 'react'
import { StepKey, DATA_STEPS_INFO, StepInfo, DATA_STEPS } from './dataSteps'

type ScaffoldProps = {
  step: StepKey
  children: React.ReactNode
}

const Scaffold: React.FC<ScaffoldProps> = ({ step, children }) => {
  return (
    <div>
      <SharedHeader step={step} />
      <div className="mt-2 mx-3">{children}</div>
    </div>
  )
}

const SharedHeader: React.FC<{ step: StepKey }> = ({ step }) => {
  const info: StepInfo = DATA_STEPS_INFO[step]

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900">{info.title}</h1>
        <p className="mt-2 text-slate-600">{info.subtitle}</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="flex gap-3">
          {DATA_STEPS.map((s, i) => (
            <div
              key={s}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                i + 1 <= info.order
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-300 text-slate-600'
              }`}
            >
              {i + 1}. {s.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Scaffold
