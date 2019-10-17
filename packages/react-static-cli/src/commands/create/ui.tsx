import React, { Fragment, useEffect, useReducer, Dispatch } from "react"

import { Color, Text, Box } from "ink"
import StyledBox from "ink-box"

import Spinner from "ink-spinner"
import { Manifest } from "pacote"
import padEnd from "lodash.padend"

import { InputProjectName } from "./components/InputProjectName"
import { ResolveTemplate } from "./components/ResolveTemplate"
import { SelectPackageManager } from "./components/SelectProjectManager"
import { SelectTemplate } from "./components/SelectTemplate"
import { Execute } from "./components/Execute"

interface CreateCommandProps {
  name?: string
  debug?: true
  yarn?: true
  npm?: true
  templateSpec?: string
}

type QuestionName =
  | "<none>"
  | "template"
  | "<resolve-template>"
  | "package-manager"
  | "project-name"
  | "<execute>"
  | "<done>"

interface CommandState {
  question: QuestionName
  name?: string
  template?: Manifest
  templateSpec?: string
  templateLocal?: false | { path: string }
  packageManager?: "yarn" | "npm"
  path?: string
}

type ActionInit = {
  type: "init"
  name?: string
  yarn?: true
  npm?: true
  templateSpec?: string
}

type ActionSetTemplate = {
  type: "set-template"
  value: Manifest
  isLocal: boolean
  localPath?: string
}

type ActionRequestResolveTemplate = {
  type: "request-resolve-template"
  value: string
}

interface ActionSetPackageManager {
  type: "set-package-manager"
  value: "yarn" | "npm"
}

interface ActionSetProjectName {
  type: "set-project-name"
  value: string
}

interface ActionFinish {
  type: "finish"
  path: string
}

type CommandAction =
  | ActionInit
  | ActionSetTemplate
  | ActionRequestResolveTemplate
  | ActionSetPackageManager
  | ActionSetProjectName
  | ActionFinish

function commandReducer(
  state: Readonly<CommandState>,
  action: CommandAction
): CommandState {
  switch (action.type) {
    case "init": {
      const nextState: CommandState = {
        ...state,
        name: action.name,
        templateSpec: action.templateSpec,
        packageManager: action.yarn ? "yarn" : action.npm ? "npm" : undefined
      }

      return withNewQuestion(nextState)
    }
    case "request-resolve-template": {
      return {
        ...state,
        templateSpec: action.value,
        question: "<resolve-template>"
      }
    }
    case "set-template": {
      const nextState: CommandState = {
        ...state,
        template: action.value,
        templateLocal: action.isLocal ? { path: action.localPath! } : false
      }
      return withNewQuestion(nextState)
    }
    case "set-project-name": {
      const nextState: CommandState = {
        ...state,
        name: action.value
      }

      return withNewQuestion(nextState)
    }
    case "set-package-manager": {
      const nextState: CommandState = {
        ...state,
        packageManager: action.value
      }

      return withNewQuestion(nextState)
    }
    case "finish": {
      return { ...state, question: "<done>", path: action.path }
    }
  }
}

function withNewQuestion(state: Readonly<CommandState>): CommandState {
  if (!state.template) {
    return {
      ...state,
      question: state.templateSpec ? "<resolve-template>" : "template"
    }
  }

  if (!state.packageManager) {
    return { ...state, question: "package-manager" }
  }

  if (!state.name) {
    return { ...state, question: "project-name" }
  }

  return { ...state, question: "<execute>" }
}

const doubleDispatch: {
  [K in CommandState["question"]]: (
    state: Readonly<CommandState>,
    dispatch: Dispatch<CommandAction>,
    opts?: CreateCommandProps
  ) => JSX.Element
} = {
  "<none>": renderInit,
  "<done>": renderDone,
  "<execute>": renderExecute,
  "<resolve-template>": renderResolveTemplate,
  "package-manager": renderAskPackageManager,
  "project-name": renderAskProjectName,
  template: renderAskTemplate
}

const initialState: CommandState = Object.freeze({ question: "<none>" })

export function CreateCommand(opts: CreateCommandProps): JSX.Element {
  const [state, dispatch] = useReducer(commandReducer, initialState)

  const { question } = state
  const rendered = doubleDispatch[question](state, dispatch, opts)

  if (question === "<done>") {
    return <Box>{rendered}</Box>
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Color grey>
          <Text>Creating a new react-static project</Text>
        </Color>
      </Box>
      <Box>{renderAnswered(state, dispatch, opts)}</Box>
      {rendered}
    </Box>
  )
}

function Init({ onInit }: { onInit(): void }): JSX.Element {
  useEffect(() => {
    onInit()
  }, [])

  return (
    <Fragment>
      <Color greenBright>
        <Spinner type="dots" />
      </Color>
      {" Loading"}
    </Fragment>
  )
}

function renderInit(
  _: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  opts?: CreateCommandProps
): JSX.Element {
  return <Init onInit={(): void => dispatch({ type: "init", ...opts })} />
}

function renderAnswered(
  state: Readonly<CommandState>,
  _: Dispatch<CommandAction>,
  opts?: CreateCommandProps
): JSX.Element {
  const max =
    Math.max("name".length, "template".length, "package manager".length) + 3

  return (
    <Box flexDirection="column">
      {(state.template || (opts && opts.templateSpec)) && (
        <Box flexDirection="row">
          <Color yellowBright>
            <Text>{padEnd("template", max)}</Text>
          </Color>
          <Text>
            {state.template
              ? `${state.template.name}@${state.template.version}`
              : `- (${(opts && opts.templateSpec) || "<select>"})`}
          </Text>
        </Box>
      )}
      {state.packageManager && (
        <Box flexDirection="row">
          <Color yellowBright>
            <Text>{padEnd("package manager", max)}</Text>
          </Color>
          <Text>{state.packageManager}</Text>
        </Box>
      )}
      {state.name && (
        <Box flexDirection="row">
          <Color yellowBright>
            <Text>{padEnd("name", max)}</Text>
          </Color>
          <Text>{state.name}</Text>
        </Box>
      )}
    </Box>
  )
}

function renderResolveTemplate(
  state: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  _?: CreateCommandProps
): JSX.Element {
  return (
    <ResolveTemplate
      templateSpec={state.templateSpec!}
      onResolved={(
        template: Manifest,
        isLocal: boolean,
        localPath: string
      ): void => {
        dispatch({
          type: "set-template",
          value: template,
          isLocal,
          localPath
        })
      }}
    />
  )
}

function renderAskTemplate(
  _: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  __?: CreateCommandProps
): JSX.Element {
  return (
    <SelectTemplate
      onSelect={(value): void =>
        dispatch({ type: "request-resolve-template", value })
      }
    />
  )
}

function renderAskPackageManager(
  state: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  _?: CreateCommandProps
): JSX.Element {
  return (
    <SelectPackageManager
      packageManager={state.packageManager}
      onSelect={(choice): void => {
        dispatch({
          type: "set-package-manager",
          value: choice
        })
      }}
    />
  )
}

function renderAskProjectName(
  state: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  _?: CreateCommandProps
): JSX.Element {
  return (
    <InputProjectName
      name={state.name}
      onSubmit={(value): void => dispatch({ type: "set-project-name", value })}
    />
  )
}

function renderExecute(
  state: Readonly<CommandState>,
  dispatch: Dispatch<CommandAction>,
  _?: CreateCommandProps
): JSX.Element {
  const opts = {
    template: state.template!,
    isLocal: state.templateLocal !== undefined,
    localPath: (state.templateLocal && state.templateLocal.path) || undefined,
    name: state.name!,
    packageManager: state.packageManager!
  }
  return (
    <Execute
      opts={opts}
      onFinish={(path): void => dispatch({ type: "finish", path })}
    />
  )
}

function renderDone(
  state: Readonly<CommandState>,
  _: Dispatch<CommandAction>,
  __?: CreateCommandProps
): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text>
        Your project <Color yellowBright>{state.name!}</Color> based on{" "}
        <Color yellowBright>{state.templateSpec!}</Color> is ready.
      </Text>
      <StyledBox borderStyle="round" borderColor="greenBright" padding={1}>
        <Text>
          <Color greenBright>{state.path!}</Color>
        </Text>
      </StyledBox>
    </Box>
  )
}
