/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOW_TOKEN_ADDRESS: string
  readonly VITE_EXAM_STAKING_ADDRESS: string
  readonly VITE_STUDENT_REGISTRY_ADDRESS: string
  readonly VITE_VERIFIER_REGISTRY_ADDRESS: string
  readonly VITE_PYUSD_ADDRESS: string
  readonly VITE_FLOW_EVM_RPC_URL: string
  readonly VITE_FLOW_EVM_CHAIN_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}