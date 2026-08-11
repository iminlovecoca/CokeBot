const pendingRequests = new Map();

const createRequest = ({
  type,
  senderId,
  receiverId,
  prompt = null,
  data = {},
  onAccept,
  onDecline,
  onExpire,
  timeoutMs = 600000,
}) => {
  if (pendingRequests.has(receiverId)) {
    const old = pendingRequests.get(receiverId);
    if (old.timer) clearTimeout(old.timer);
    pendingRequests.delete(receiverId);
  }

  const req = {
    type,
    senderId,
    receiverId,
    prompt,
    data,
    onAccept,
    onDecline,
    onExpire,
    createdAt: Date.now(),
    expiresAt: Date.now() + timeoutMs,
  };

  req.timer = setTimeout(async () => {
    if (pendingRequests.get(receiverId) === req) {
      pendingRequests.delete(receiverId);
      if (onExpire) {
        try {
          await onExpire(req);
        } catch (err) {
          console.error(`[CONFIRMATION_MANAGER] Error in onExpire (${type}):`, err);
        }
      }
    }
  }, timeoutMs);

  pendingRequests.set(receiverId, req);
  return req;
};

const findRequest = (userId) => {
  for (const [key, req] of pendingRequests.entries()) {
    if (req.senderId === userId || req.receiverId === userId) {
      return { key, request: req };
    }
  }
  return null;
};

const acceptRequest = async (userId, triggerContext) => {
  const req = pendingRequests.get(userId);

  if (!req) {
    const found = findRequest(userId);
    if (found && found.request.senderId === userId) {
      const msg = "❌ Bạn là người gửi yêu cầu. Chỉ người được đề nghị mới có thể chấp nhận!";
      if (triggerContext.reply) {
        return triggerContext.reply(msg);
      }
      return;
    }
    const msg = "❌ Bạn hiện không có yêu cầu hay lời mời nào đang chờ chấp nhận!";
    if (triggerContext.reply) {
      return triggerContext.reply(msg);
    }
    return;
  }

  if (req.timer) clearTimeout(req.timer);
  pendingRequests.delete(userId);

  try {
    await req.onAccept(req, triggerContext);
  } catch (err) {
    console.error(`[CONFIRMATION_MANAGER] Error executing onAccept (${req.type}):`, err);
  }
};

const declineRequest = async (userId, triggerContext) => {
  const found = findRequest(userId);

  if (!found) {
    const msg = "❌ Bạn hiện không có yêu cầu hay lời mời nào để từ chối hoặc hủy!";
    if (triggerContext.reply) {
      return triggerContext.reply(msg);
    }
    return;
  }

  const { key, request: req } = found;
  const isSender = userId === req.senderId;

  if (req.timer) clearTimeout(req.timer);
  pendingRequests.delete(key);

  try {
    await req.onDecline(req, triggerContext, isSender);
  } catch (err) {
    console.error(`[CONFIRMATION_MANAGER] Error executing onDecline (${req.type}):`, err);
  }
};

module.exports = {
  pendingRequests,
  createRequest,
  findRequest,
  acceptRequest,
  declineRequest,
};
