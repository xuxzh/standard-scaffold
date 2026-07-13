#!/usr/bin/env bash
set -euo pipefail

PROFILE_NAME="mes-data-analyst"
PROFILE_PORT="8650"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
HERMES_ROOT="${HERMES_HOME:-${HOME}/.hermes}"
PROFILE_DIR="${HERMES_ROOT}/profiles/${PROFILE_NAME}"
OVERLAY_FILE="${SCRIPT_DIR}/config.overlay.yaml"
ENV_TEMPLATE="${SCRIPT_DIR}/profile.env.example"
SOUL_TEMPLATE="${SCRIPT_DIR}/SOUL.md"

fail() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

validate_templates() {
  require_command node
  for file in "${OVERLAY_FILE}" "${ENV_TEMPLATE}" "${SOUL_TEMPLATE}"; do
    [[ -f "${file}" ]] || fail "Missing template: ${file}"
  done

  grep -Fq "API_SERVER_HOST=127.0.0.1" "${ENV_TEMPLATE}" || fail "API server must bind to 127.0.0.1"
  grep -Fq "API_SERVER_PORT=${PROFILE_PORT}" "${ENV_TEMPLATE}" || fail "Unexpected API server port"
  grep -Fq "API_SERVER_ENABLED=true" "${ENV_TEMPLATE}" || fail "API server must be enabled"
  grep -Fq "  mes_data:" "${OVERLAY_FILE}" || fail "MCP server key must be mes_data"
  grep -Fq "    - mes_data" "${OVERLAY_FILE}" || fail "API server toolset must contain mes_data"
  grep -Fq "apps/mes-data-mcp/dist/main.js" "${OVERLAY_FILE}" || fail "MCP entrypoint is invalid"
  for key in MES_DB_SERVER MES_DB_PORT MES_DB_DATABASE MES_DB_USER MES_DB_PASSWORD MES_DB_ENCRYPT MES_DB_TRUST_SERVER_CERTIFICATE; do
    grep -Fq "      ${key}: \${${key}}" "${OVERLAY_FILE}" || fail "MCP environment must explicitly pass ${key}"
  done

  if grep -Eqi '(password|key)=[^#]*(sa|[[:alnum:]]{24,})$' "${ENV_TEMPLATE}"; then
    fail "Environment template appears to contain a real credential"
  fi
  if grep -Eqi '(telegram|discord|wechat|weixin|feishu|whatsapp|slack)' "${OVERLAY_FILE}"; then
    fail "Messaging platforms are forbidden in this profile"
  fi
  echo "Templates are valid."
}

show_plan() {
  cat <<EOF
Planned Hermes profile installation (no changes made):
  profile: ${PROFILE_NAME}
  directory: ${PROFILE_DIR}
  API server: 127.0.0.1:${PROFILE_PORT}
  files written or merged:
    ${PROFILE_DIR}/config.yaml
    ${PROFILE_DIR}/SOUL.md
  file not populated by this script:
    ${PROFILE_DIR}/.env (Hermes may create an empty file)

Review ${ENV_TEMPLATE}, confirm port ${PROFILE_PORT} is free, then run:
  ${SCRIPT_DIR}/install-macos.sh --apply
EOF
}

install_profile_files() {
  local node_binary config_file
  node_binary="$(node -p 'process.execPath')"
  config_file="${PROFILE_DIR}/config.yaml"
  (
    cd "${REPOSITORY_ROOT}/apps/api"
    node --input-type=module - "${config_file}" "${OVERLAY_FILE}" "${REPOSITORY_ROOT}" "${node_binary}" <<'NODE'
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "yaml";

const [configFile, overlayFile, repositoryRoot, nodeBinary] = process.argv.slice(2);
const base = existsSync(configFile)
  ? (parse(readFileSync(configFile, "utf8")) ?? {})
  : {};
const overlayText = readFileSync(overlayFile, "utf8")
  .replaceAll("__REPOSITORY_ROOT__", repositoryRoot)
  .replaceAll("__NODE_BINARY__", nodeBinary);
const overlay = parse(overlayText);

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = merge(
        target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
          ? target[key]
          : {},
        value,
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}

writeFileSync(configFile, stringify(merge(base, overlay)), { mode: 0o600 });
NODE
  )
  install -m 600 "${SOUL_TEMPLATE}" "${PROFILE_DIR}/SOUL.md"

  echo "Profile files installed without starting a gateway."
  echo "Manually merge ${ENV_TEMPLATE} into ${PROFILE_DIR}/.env, set real secrets, and run chmod 600."
}

check_apply_prerequisites() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "This installer supports macOS only"
  require_command hermes
  require_command pnpm
  [[ -f "${REPOSITORY_ROOT}/apps/mes-data-mcp/dist/main.js" ]] || fail "Build MCP first: pnpm --filter @repo/mes-data-mcp build"
  if lsof -nP -iTCP:"${PROFILE_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "Port ${PROFILE_PORT} is already in use; profile files were not changed"
  fi
}

apply_profile() {
  check_apply_prerequisites
  [[ ! -e "${PROFILE_DIR}" ]] || fail "Profile already exists. Inspect it with: hermes profile show ${PROFILE_NAME}"

  hermes profile create mes-data-analyst --no-skills --description "Read-only MES data analysis for standard-scaffold"
  [[ -d "${PROFILE_DIR}" ]] || fail "Hermes did not create the expected profile directory"
  install_profile_files
}

resume_profile() {
  check_apply_prerequisites
  [[ -d "${PROFILE_DIR}" ]] || fail "Profile does not exist; use --apply"
  [[ -f "${PROFILE_DIR}/profile.yaml" ]] || fail "Existing profile is not an incomplete installer-created profile"
  [[ -f "${PROFILE_DIR}/.no-bundled-skills" ]] || fail "Existing profile does not have the expected no-skills marker"
  [[ ! -e "${PROFILE_DIR}/config.yaml" ]] || fail "Profile already has config.yaml; inspect it manually instead of resuming"
  install_profile_files
}

validate_templates
case "${1:-}" in
  --check)
    ;;
  --apply)
    apply_profile
    ;;
  --resume)
    resume_profile
    ;;
  "")
    show_plan
    ;;
  *)
    fail "Usage: $0 [--check|--apply|--resume]"
    ;;
esac
