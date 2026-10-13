// How often the admin checks for new orders while it is open (also in a background tab)
export const PENDING_POLL_MS = 60_000

const BASE_TITLE = 'Coovi Admin'

// "(3) Coovi Admin" in the browser tab while orders wait for confirmation
export const pendingTitle = (count: number): string => (count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE)
