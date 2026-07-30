const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

function getToken() {
  return localStorage.getItem("bgalaxy_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const detail = error.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
      : typeof detail === "string"
        ? detail
        : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  reportFrontendError: (data) =>
    request("/logs/frontend", { method: "POST", body: data }).catch(() => {}),
  getLogs: (params = {}) => request(`/logs?${new URLSearchParams(params)}`),
  getLogsCount: () => request("/logs/count"),
  getDevelopers: () => request("/developers"),
  grantDeveloper: (email) => request("/developers/grant", { method: "POST", body: { email } }),
  revokeDeveloper: (userId) => request(`/developers/${userId}`, { method: "DELETE" }),
  submitComplaint: async (message, path, contactEmail, files = []) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("message", message || "");
    formData.append("contact_email", contactEmail || "");
    if (path) formData.append("path", path);
    for (const file of files || []) {
      formData.append("files", file);
    }
    const res = await fetch(`${API_BASE}/complaints`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${res.status}`);
    }
    return null;
  },
  getComplaints: (params = {}) => request(`/complaints?${new URLSearchParams(params)}`),
  resolveComplaint: (id) => request(`/complaints/${id}/resolve`, { method: "PATCH" }),
  register: (data) => request("/auth/register", { method: "POST", body: data, auth: false }),
  login: (data) => request("/auth/login", { method: "POST", body: data, auth: false }),
  loginWithGoogle: (idToken) => request("/auth/google", { method: "POST", body: { id_token: idToken }, auth: false }),
  resendVerification: (email) => request("/auth/resend-verification", { method: "POST", body: { email }, auth: false }),
  verifyEmail: (token) => request(`/auth/verify-email/${token}`, { auth: false }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (token, newPassword) =>
    request("/auth/reset-password", { method: "POST", body: { token, new_password: newPassword }, auth: false }),
  createCompany: (data) => request("/companies", { method: "POST", body: data }),
  updateCompany: (companyId, data) =>
    request(`/companies/${companyId}`, { method: "PATCH", body: data }),
  deleteCompany: (companyId) => request(`/companies/${companyId}`, { method: "DELETE" }),
  getMyCompanies: () => request("/companies/mine"),
  geoSearch: (q, region = null, category = null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (region) params.set("region", region);
    if (category) params.set("category", category);
    return request(`/geo/search?${params}`);
  },
  geoCategories: () => request("/geo/categories"),
  geoReverse: (lat, lng) =>
    request(`/geo/reverse?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`),
  updateWarehouseSettings: (companyId, hasWarehouse, warehouseType) =>
    request(`/companies/${companyId}/warehouse/settings`, {
      method: "PATCH",
      body: { has_warehouse: hasWarehouse, warehouse_type: warehouseType },
    }),
  getWarehouses: (companyId) => request(`/companies/${companyId}/warehouse/list`),
  createWarehouse: (companyId, warehouseType, name = null) =>
    request(`/companies/${companyId}/warehouse/list`, {
      method: "POST",
      body: { warehouse_type: warehouseType, name },
    }),
  deleteWarehouse: (companyId, warehouseId) =>
    request(`/companies/${companyId}/warehouse/list/${warehouseId}`, { method: "DELETE" }),
  getWarehouseProducts: (companyId, warehouseId = null) =>
    request(
      `/companies/${companyId}/warehouse/products${warehouseId ? `?warehouse_id=${warehouseId}` : ""}`
    ),
  getWarehouseDashboard: (companyId, period, warehouseId = null) =>
    request(
      `/companies/${companyId}/warehouse/dashboard?period=${period}${
        warehouseId ? `&warehouse_id=${warehouseId}` : ""
      }`
    ),
  getWarehouseFinanceLedger: (companyId, { period = "month", kinds = "all", warehouseId = null, search = "", page = 1, pageSize = 20 } = {}) => {
    const params = new URLSearchParams({
      period,
      kinds,
      page: String(page),
      page_size: String(pageSize),
    });
    if (warehouseId) params.set("warehouse_id", warehouseId);
    if (search) params.set("search", search);
    return request(`/companies/${companyId}/warehouse/finance-ledger?${params}`);
  },
  downloadWarehouseFinanceLedger: async (
    companyId,
    { period = "month", kinds = "all", warehouseId = null, search = "", format = "csv" } = {}
  ) => {
    const token = getToken();
    const params = new URLSearchParams({ period, kinds, format });
    if (warehouseId) params.set("warehouse_id", warehouseId);
    if (search) params.set("search", search);
    const res = await fetch(
      `${API_BASE}/companies/${companyId}/warehouse/finance-ledger/export?${params}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || "Eksportni yuklab bo'lmadi");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ombor-moliya-${new Date().toISOString().slice(0, 10)}.${format === "excel" || format === "xlsx" ? "xlsx" : "csv"}`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  getMarketplaceSellers: (companyId) =>
    request(`/companies/${companyId}/warehouse/marketplace/sellers`),
  getMarketplaceSellerProducts: (companyId, sellerId) =>
    request(`/companies/${companyId}/warehouse/marketplace/sellers/${sellerId}/products`),
  getWarehouseMarketplace: (companyId, sellerId = null) =>
    request(
      `/companies/${companyId}/warehouse/marketplace${
        sellerId ? `?seller_id=${encodeURIComponent(sellerId)}` : ""
      }`
    ),
  placeWarehouseOrder: (companyId, sellerCompanyId, productId, quantity, warehouseId = null) =>
    request(`/companies/${companyId}/warehouse/marketplace/order`, {
      method: "POST",
      body: {
        seller_company_id: sellerCompanyId,
        product_id: productId,
        quantity,
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      },
    }),
  placeWarehouseCartOrder: (companyId, sellerCompanyId, items, warehouseId = null) =>
    request(`/companies/${companyId}/warehouse/marketplace/cart-order`, {
      method: "POST",
      body: {
        seller_company_id: sellerCompanyId,
        items,
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      },
    }),
  listProductOnMarketplace: (companyId, productId, price) =>
    request(`/companies/${companyId}/warehouse/products/${productId}/list-marketplace`, {
      method: "POST",
      body: { price },
    }),
  unlistProductFromMarketplace: (companyId, productId) =>
    request(`/companies/${companyId}/warehouse/products/${productId}/unlist-marketplace`, {
      method: "POST",
    }),
  rateWarehouseCompany: (companyId, ratedCompanyId, orderId, score) =>
    request(`/companies/${companyId}/warehouse/ratings`, {
      method: "POST",
      body: { rated_company_id: ratedCompanyId, order_id: orderId, score },
    }),
  getWarehouseOrders: (companyId, scope = "auto", status = null) =>
    request(
      `/companies/${companyId}/warehouse/orders?scope=${encodeURIComponent(scope)}${
        status ? `&status=${encodeURIComponent(status)}` : ""
      }`
    ),
  getWarehouseOrder: (companyId, orderId) =>
    request(`/companies/${companyId}/warehouse/orders/${orderId}`),
  transitionWarehouseOrder: (companyId, orderId, action, note = null) =>
    request(`/companies/${companyId}/warehouse/orders/${orderId}/transition`, {
      method: "POST",
      body: { action, ...(note ? { note } : {}) },
    }),
  createWarehouseProduct: (companyId, data) =>
    request(`/companies/${companyId}/warehouse/products`, { method: "POST", body: data }),
  updateWarehouseProduct: (companyId, productId, data) =>
    request(`/companies/${companyId}/warehouse/products/${productId}`, { method: "PATCH", body: data }),
  deleteWarehouseProduct: (companyId, productId) =>
    request(`/companies/${companyId}/warehouse/products/${productId}`, { method: "DELETE" }),
  adjustWarehouseStock: (companyId, productId, change, note) =>
    request(`/companies/${companyId}/warehouse/products/${productId}/stock`, {
      method: "POST",
      body: { change, note },
    }),
  getWarehouseStockHistory: (companyId, productId) =>
    request(`/companies/${companyId}/warehouse/products/${productId}/history`),
  getMe: () => request("/auth/me"),
  getBootstrap: (activeCompanyId = null) =>
    request(
      `/auth/bootstrap${
        activeCompanyId ? `?active_company_id=${encodeURIComponent(activeCompanyId)}` : ""
      }`
    ),
  getChannels: (companyId) => request(`/companies/${companyId}/channels`),
  createChannel: (companyId, data) =>
    request(`/companies/${companyId}/channels`, { method: "POST", body: data }),
  renameChannel: (companyId, channelId, name) =>
    request(`/companies/${companyId}/channels/${channelId}`, { method: "PATCH", body: { name } }),
  addChannelMembers: (companyId, channelId, userIds) =>
    request(`/companies/${companyId}/channels/${channelId}/members`, {
      method: "POST",
      body: { user_ids: userIds },
    }),
  getChannelMembers: (companyId, channelId) =>
    request(`/companies/${companyId}/channels/${channelId}/members`),
  removeChannelMember: (companyId, channelId, userId) =>
    request(`/companies/${companyId}/channels/${channelId}/members/${userId}`, { method: "DELETE" }),
  deleteChannel: (companyId, channelId) =>
    request(`/companies/${companyId}/channels/${channelId}`, { method: "DELETE" }),
  getMentionCandidates: (companyId, channelId, q) =>
    request(`/companies/${companyId}/channels/${channelId}/mention-candidates?q=${encodeURIComponent(q)}`),
  getMessages: (channelId) => request(`/channels/${channelId}/messages`),
  createInvite: (companyId, data) =>
    request(`/companies/${companyId}/invites`, { method: "POST", body: data }),
  previewInvite: (token) => request(`/invites/${token}`, { auth: false }),
  acceptInvite: (token) => request(`/invites/${token}/accept`, { method: "POST" }),
  getCallStatus: (companyId) => request(`/companies/${companyId}/call-status`),
  requestJoin: (callId) => request(`/meetings/${callId}/join-requests`, { method: "POST" }),
  getJoinRequestStatus: (callId, requestId) =>
    request(`/meetings/${callId}/join-requests/${requestId}`),
  respondJoinRequest: (callId, requestId, approved) =>
    request(`/meetings/${callId}/join-requests/${requestId}/respond`, {
      method: "POST",
      body: { approved },
    }),
  getMembers: (companyId) => request(`/companies/${companyId}/members`),
  forwardMessage: (channelId, data) =>
    request(`/channels/${channelId}/messages`, { method: "POST", body: data }),
  updateMessage: (channelId, messageId, content) =>
    request(`/channels/${channelId}/messages/${messageId}`, { method: "PATCH", body: { content } }),
  deleteMessage: (channelId, messageId) =>
    request(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" }),
  getRoles: (companyId) => request(`/companies/${companyId}/roles`),
  createRole: (companyId, data) =>
    request(`/companies/${companyId}/roles`, { method: "POST", body: data }),
  updateRole: (companyId, roleId, data) =>
    request(`/companies/${companyId}/roles/${roleId}`, { method: "PATCH", body: data }),
  deleteRole: (companyId, roleId) =>
    request(`/companies/${companyId}/roles/${roleId}`, { method: "DELETE" }),
  assignMemberRole: (companyId, userId, roleId) =>
    request(`/companies/${companyId}/members/${userId}/role`, {
      method: "PATCH",
      body: { role_id: roleId },
    }),
  removeMember: (companyId, userId) =>
    request(`/companies/${companyId}/members/${userId}`, { method: "DELETE" }),
  setHeadAdmin: (companyId, userId) =>
    request(`/companies/${companyId}/head-admin`, { method: "POST", body: { user_id: userId } }),
  transferOwnership: (companyId, newOwnerId, password) =>
    request(`/companies/${companyId}/transfer-ownership`, {
      method: "POST",
      body: { new_owner_id: newOwnerId, password },
    }),
  getMyPermissions: (companyId) => request(`/companies/${companyId}/my-permissions`),
  getTransactions: (companyId, params = {}) =>
    request(`/companies/${companyId}/accounting/transactions?${new URLSearchParams(params)}`),
  createTransaction: (companyId, data) =>
    request(`/companies/${companyId}/accounting/transactions`, { method: "POST", body: data }),
  deleteTransaction: (companyId, id) =>
    request(`/companies/${companyId}/accounting/transactions/${id}`, { method: "DELETE" }),
  getInvoices: (companyId, params = {}) =>
    request(`/companies/${companyId}/accounting/invoices?${new URLSearchParams(params)}`),
  createInvoice: (companyId, data) =>
    request(`/companies/${companyId}/accounting/invoices`, { method: "POST", body: data }),
  updateInvoice: (companyId, id, data) =>
    request(`/companies/${companyId}/accounting/invoices/${id}`, { method: "PATCH", body: data }),
  deleteInvoice: (companyId, id) =>
    request(`/companies/${companyId}/accounting/invoices/${id}`, { method: "DELETE" }),
  getPayroll: (companyId, params = {}) =>
    request(`/companies/${companyId}/accounting/payroll?${new URLSearchParams(params)}`),
  createPayroll: (companyId, data) =>
    request(`/companies/${companyId}/accounting/payroll`, { method: "POST", body: data }),
  markPayrollPaid: (companyId, id) =>
    request(`/companies/${companyId}/accounting/payroll/${id}/pay`, { method: "PATCH" }),
  getAccountingSummary: (companyId, month) =>
    request(`/companies/${companyId}/accounting/summary?month=${month}`),
  getAccountingStats: (companyId, period) =>
    request(`/companies/${companyId}/accounting/stats?period=${period}`),
  getAccountingReportData: (companyId, dateFrom, dateTo) =>
    request(`/companies/${companyId}/accounting/report-data?date_from=${dateFrom}&date_to=${dateTo}`),
  getNotifications: () => request("/notifications"),
  dismissNotification: (id) => request(`/notifications/${id}/dismiss`, { method: "POST" }),
  getGroupCallToken: (companyId) =>
    request(`/companies/${companyId}/group-call/token`, { method: "POST" }),
  getActiveGroupCall: (companyId) => request(`/companies/${companyId}/group-call/active`),
  leaveGroupCall: (companyId, scheduledMeetingId) =>
    request(
      `/companies/${companyId}/group-call/leave${
        scheduledMeetingId ? `?scheduled_meeting_id=${encodeURIComponent(scheduledMeetingId)}` : ""
      }`,
      { method: "POST" }
    ),
  muteGroupCallParticipant: (companyId, userId, kind, muted) =>
    request(`/companies/${companyId}/group-call/mute/${userId}?kind=${kind}&muted=${muted}`, { method: "POST" }),
  getOfficeVoiceToken: (companyId) =>
    request(`/companies/${companyId}/office/voice-token`, { method: "POST" }),
  getOfficePresence: (companyId) => request(`/companies/${companyId}/office/presence`),
  startOfficeCall: (companyId, targetUserId) =>
    request(`/companies/${companyId}/office/call/${targetUserId}`, { method: "POST" }),
  acceptOfficeCall: (companyId, roomName) =>
    request(`/companies/${companyId}/office/call/${roomName}/accept`, { method: "POST" }),
  rejectOfficeCall: (companyId, roomName, callerId) =>
    request(`/companies/${companyId}/office/call/${roomName}/reject?caller_id=${callerId}`, { method: "POST" }),
  cancelOfficeCall: (companyId, roomName, targetUserId) =>
    request(`/companies/${companyId}/office/call/${roomName}/cancel?target_user_id=${targetUserId}`, { method: "POST" }),
  startPartnerMeeting: (partnerIds) =>
    request("/partner-meetings/start", { method: "POST", body: { partner_ids: partnerIds } }),
  joinPartnerMeeting: (roomName) =>
    request("/partner-meetings/join", { method: "POST", body: { room_name: roomName } }),
  addToPartnerMeeting: (roomName, partnerIds) =>
    request(`/partner-meetings/${roomName}/add`, { method: "POST", body: { partner_ids: partnerIds } }),
  getActivePartnerMeetings: () => request("/partner-meetings/active"),
  mutePartnerMeetingParticipant: (roomName, userId, kind, muted) =>
    request(`/partner-meetings/${roomName}/mute/${userId}?kind=${kind}&muted=${muted}`, { method: "POST" }),
  getScheduledMeetings: () => request("/scheduled-meetings"),
  createScheduledMeeting: (data) => request("/scheduled-meetings", { method: "POST", body: data }),
  updateScheduledMeeting: (id, data) =>
    request(`/scheduled-meetings/${id}`, { method: "PATCH", body: data }),
  cancelScheduledMeeting: (id) => request(`/scheduled-meetings/${id}`, { method: "DELETE" }),
  getScheduledMeeting: (id) => request(`/scheduled-meetings/${id}`),
  getTasks: (companyId) => request(`/companies/${companyId}/tasks`),
  createTask: (companyId, data) =>
    request(`/companies/${companyId}/tasks`, { method: "POST", body: data }),
  updateTask: (companyId, taskId, data) =>
    request(`/companies/${companyId}/tasks/${taskId}`, { method: "PATCH", body: data }),
  deleteTask: (companyId, taskId) =>
    request(`/companies/${companyId}/tasks/${taskId}`, { method: "DELETE" }),
  getTaskComments: (companyId, taskId) =>
    request(`/companies/${companyId}/tasks/comments/${taskId}`),
  addTaskComment: async (companyId, taskId, content, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("content", content || "");
    if (file) formData.append("file", file);
    const res = await fetch(`${API_BASE}/companies/${companyId}/tasks/comments/${taskId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const detail = error.detail || `Request failed: ${res.status}`;
      throw new Error(
        res.status === 404
          ? "Izohlar serveri hali tayyor emas. Birozdan keyin qayta urinib ko'ring."
          : detail
      );
    }
    return res.json();
  },
  deleteTaskComment: (companyId, taskId, commentId) =>
    request(`/companies/${companyId}/tasks/comments/${taskId}/${commentId}`, { method: "DELETE" }),
  getTaskHistory: (companyId, params = {}) =>
    request(`/companies/${companyId}/tasks/history?${new URLSearchParams(params)}`),
  getTaskLeaderboard: (companyId) => request(`/companies/${companyId}/tasks/leaderboard`),
  getMonthlyChampion: (companyId) => request(`/companies/${companyId}/tasks/monthly-champion`),
  getYearlySummary: (companyId) => request(`/companies/${companyId}/accounting/yearly-summary`),
  getCompanyAnalytics: (companyId, params = {}) => request(`/companies/${companyId}/analytics?${new URLSearchParams(params)}`),
  getMemberAnalytics: (companyId, userId, params = {}) =>
    request(`/companies/${companyId}/analytics/member/${userId}?${new URLSearchParams(params)}`),
  getConversations: () => request("/direct-conversations"),
  startConversation: (partnerIds, channel = "chat", forceNew = false) =>
    request("/direct-conversations", {
      method: "POST",
      body: { partner_ids: partnerIds, channel, force_new: forceNew },
    }),
  deleteConversation: (conversationId) =>
    request(`/direct-conversations/${conversationId}`, { method: "DELETE" }),
  getConversationMembers: (conversationId) => request(`/direct-conversations/${conversationId}/members`),
  leaveConversation: (conversationId) =>
    request(`/direct-conversations/${conversationId}/members/me`, { method: "DELETE" }),
  getDirectMessages: (conversationId) => request(`/direct-conversations/${conversationId}/messages`),
  sendDirectMessage: async (conversationId, content, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("content", content || "");
    if (file) formData.append("file", file);
    const res = await fetch(`${API_BASE}/direct-conversations/${conversationId}/messages`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  updateDirectMessage: (conversationId, messageId, content) =>
    request(`/direct-conversations/${conversationId}/messages/${messageId}`, { method: "PATCH", body: { content } }),
  deleteDirectMessage: (conversationId, messageId) =>
    request(`/direct-conversations/${conversationId}/messages/${messageId}`, { method: "DELETE" }),
  downloadTaskHistoryExcel: async (companyId, dateFrom, dateTo) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/companies/${companyId}/tasks/history/report-excel?date_from=${dateFrom}&date_to=${dateTo}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("Hisobotni yuklab bo'lmadi");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vazifalar-${dateFrom}_${dateTo}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
  acceptJoinRequest: (id) => request(`/notifications/${id}/accept`, { method: "POST" }),
  rejectJoinRequest: (id) => request(`/notifications/${id}/reject`, { method: "POST" }),
  downloadAccountingReport: async (companyId, dateFrom, dateTo) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/companies/${companyId}/accounting/report?date_from=${dateFrom}&date_to=${dateTo}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("Hisobotni yuklab bo'lmadi");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot-${dateFrom}_${dateTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  downloadAccountingReportExcel: async (companyId, dateFrom, dateTo, formulas) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/companies/${companyId}/accounting/report-excel?date_from=${dateFrom}&date_to=${dateTo}&formulas=${formulas.join(",")}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("Hisobotni yuklab bo'lmadi");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot-${dateFrom}_${dateTo}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
  generateAvatar: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/avatar/generate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  updateProfile: (data) => request("/auth/me", { method: "PATCH", body: data }),
  changePassword: (oldPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: { old_password: oldPassword, new_password: newPassword } }),
  setPin: (password, pin) => request("/auth/pin/set", { method: "POST", body: { password, pin } }),
  forgotPin: () => request("/auth/pin/forgot", { method: "POST" }),
  resetPin: (token, newPin) =>
    request("/auth/pin/reset", { method: "POST", body: { token, new_pin: newPin }, auth: false }),
  changePin: (password, oldPin, newPin) =>
    request("/auth/pin/change", { method: "POST", body: { password, old_pin: oldPin, new_pin: newPin } }),
  verifyPin: (pin) => request("/auth/pin/verify", { method: "POST", body: { pin } }),
  updateLockSettings: (autoLockMinutes) =>
    request("/auth/lock-settings", { method: "PATCH", body: { auto_lock_minutes: autoLockMinutes } }),
  getRafiqMessages: () => request("/rafiq/messages"),
  sendRafiqMessage: (message, activeCompanyId) =>
    request("/rafiq/chat", {
      method: "POST",
      body: { message, active_company_id: activeCompanyId || null },
    }),
};

export function wsUrl(path) {
  const base = API_BASE.replace(/^http/, "ws");
  const token = getToken();
  return `${base}${path}?token=${token}`;
}

export { getToken, API_BASE };
