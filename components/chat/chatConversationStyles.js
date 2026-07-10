import { Dimensions, StyleSheet } from "react-native";

// Used for messageBubble's maxWidth below. A percentage maxWidth only
// resolves correctly against a parent with a definite (non-auto) width —
// the bubble's immediate parent is the swipe-gesture wrapper, which is
// itself auto/shrink-to-fit, so "80%" had nothing definite to resolve
// against and produced inconsistent results (sometimes stretching to fill,
// sometimes wrapping text early). An absolute pixel value sidesteps that
// entirely since it doesn't need to resolve against any ancestor.
const SCREEN_WIDTH = Dimensions.get("window").width;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  jamBarAboveComposer: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRevealButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  searchMatchCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  searchNavButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 12, // rounded-square (squircle), not a circle -- matches this app's avatar convention (see AVATAR_RADIUS in chat/index.jsx)
    marginRight: 8,
  },
  headerAvatarCrossfadeContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    marginRight: 8,
    overflow: 'hidden',
  },
  headerAvatarCrossfadeImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineStatusDotInline: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  headerAvatarFallbackText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
    position: "relative",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowTheirs: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    // Without this, children (header row, message text) default to
    // alignItems:'stretch' and get stretched to the bubble's shrink-to-fit
    // width instead of measuring at their own natural size — that
    // stretch-then-relayout round trip is what caused short text (e.g. a
    // URL) to wrap onto a second line even though the bubble looked wide
    // enough. flex-start makes every child size to its own content instead.
    alignItems: "flex-start",
  },
  myMessageBubble: {
    // Background (near-black / white in dark mode) comes from AnimatedMessageBubble.
    borderTopRightRadius: 4,
  },
  theirMessageBubble: {
    // Background (white / dark surface in dark mode) comes from AnimatedMessageBubble.
    borderTopLeftRadius: 4,
  },
  myMessageText: {
    fontSize: 15,
    color: "#fff",
  },
  myMessageTextDark: {
    color: "#111111",
  },
  theirMessageText: {
    fontSize: 15,
    color: "#111111",
  },
  theirMessageTextDark: {
    color: "#F1F5F9",
  },
  bubbleHeaderRow: {
    // Deliberately NOT justifyContent:'space-between' and NOT width:'100%'.
    // This row sits inside a bubble that shrink-wraps to whichever is wider
    // (header vs. message text). Both of those properties feed back into
    // that shrink-to-fit sizing pass ambiguously — space-between alone made
    // short messages wrap to two lines (bubble width got locked to the
    // header's own ill-defined intrinsic size); adding width:'100%' to try
    // to fix that instead made EVERY sent bubble stretch edge-to-edge
    // (percentages on a child of an auto-sized parent make the whole
    // ancestor chain's width indefinite, which flex-end resolves by
    // stretching — received bubbles use justifyContent:'flex-start' and
    // happened not to visibly hit this, but it's the same underlying
    // ambiguity). A fixed gap (bubbleHeaderRight's marginLeft) makes the
    // row's natural width a deterministic sum instead — no percentages,
    // no space-between, no ambiguity.
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bubbleHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  bubbleSenderName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  bubbleTimeText: {
    fontSize: 11,
  },
  viewOnceMessageText: {
    fontStyle: 'italic',
    opacity: 0.9,
  },
  // Media message styles
  mediaContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
    width: 200,
    height: 200,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  videoPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  viewOnceIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewOnceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16, // rounded-square, matching send/attach/avatar buttons
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  // Attach button styles
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButtonDisabled: {
    opacity: 0.4,
  },

  // Media preview styles
  mediaPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mediaPreviewScroll: {
    marginBottom: 12,
  },
  mediaPreviewScrollContent: {
    paddingRight: 12,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  mediaPreviewVideoIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  mediaPreviewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 11,
  },
  mediaPreviewAddMore: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewAddMoreText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  mediaPreviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  mediaPreviewSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mediaPreviewSendText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Date and Unread Dividers - WhatsApp/Instagram style
  dividerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dividerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  unreadDividerPill: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
  },
  unreadDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Above the composer
    width: 44,
    height: 44,
    borderRadius: 16, // rounded-square, matching send/attach/avatar buttons
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
  },
  newMessageBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444', // Red badge
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  newMessageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Loading more messages indicator
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loadingMoreText: {
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '500',
  },
  noMoreMessagesText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  statusRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  messageBubbleSelected: {
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  messageBubbleHighlighted: {
    backgroundColor: '#FEF3C7', // Light yellow highlight
    borderWidth: 2,
    borderColor: '#F59E0B', // Amber border
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reactionBubbleMine: {
    backgroundColor: "#DDD6FE",
    borderColor: "#7C3AED",
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 3,
    color: "#374151",
  },
  reactionOverlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionOverlayBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  reactionOverlay: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  reactionOverlayButton: {
    marginHorizontal: 6,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionOverlayEmoji: {
    fontSize: 30,
  },
  actionsOverlayContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionsOverlayBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  actionsSheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  actionsSheetButton: {
    paddingVertical: 12,
  },
  actionsSheetReactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  actionsSheetReactionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsSheetReactionEmoji: {
    fontSize: 26,
  },
  actionsSheetText: {
    fontSize: 16,
  },
  deleteText: {
    color: "#EF4444",
  },
  selectionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    marginBottom: 10,
  },
  selectionToolbarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectionToolbarActions: {
    flexDirection: "row",
  },
  selectionToolbarButton: {
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  selectionToolbarButtonText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
  },
  editBannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  editBannerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  editBannerPreview: {
    fontSize: 12,
    color: "#4B5563",
  },
  editBannerCancel: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  // Swipe-to-reply styles
  replyIconContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    zIndex: 1,
  },
  replyIconLeft: {
    left: 8,
  },
  replyIconRight: {
    right: 8,
  },
  replyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Reply preview inside message bubble - nested card, quoting the original
  replyPreviewInBubble: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // "Mine" bubble is near-black in light mode / white in dark mode (see
  // AnimatedMessageBubble), so its reply-preview overlay/bar/text need to
  // invert too - a dark overlay that worked on the old light lilac bubble
  // would be invisible against black.
  replyPreviewInBubbleMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)', // light overlay on black bubble
  },
  replyPreviewInBubbleTheirs: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)', // Light purple tint on white bubble
  },
  replyPreviewInBubbleMineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)', // dark overlay on white bubble (dark mode)
  },
  replyPreviewInBubbleTheirsDark: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)', // purple tint on dark surface bubble
  },
  replyPreviewBar: {
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  replyPreviewBarMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // visible on black bubble (light mode)
  },
  replyPreviewBarMineDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // visible on white bubble (dark mode)
  },
  replyPreviewBarTheirs: {
    backgroundColor: '#7C3AED', // Purple accent, visible on white/dark-surface bubble
  },
  replyPreviewContent: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  replyPreviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyPreviewNameIcon: {
    marginRight: 4,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyPreviewNameMine: {
    color: 'rgba(255, 255, 255, 0.85)', // light mode: on black bubble
  },
  replyPreviewNameTheirs: {
    color: '#7C3AED', // Purple for their messages
  },
  replyPreviewText: {
    fontSize: 13,
  },
  replyPreviewTextMine: {
    color: 'rgba(255, 255, 255, 0.75)', // light mode: on black bubble
  },
  replyPreviewTextTheirs: {
    color: '#111111',
  },
  replyPreviewNameMineDark: {
    color: '#111111', // dark mode: on white bubble
  },
  replyPreviewNameTheirsDark: {
    color: '#C4B5FD', // lighter purple for legibility on dark surface
  },
  replyPreviewTextMineDark: {
    color: '#111111', // dark mode: on white bubble
  },
  replyPreviewTextTheirsDark: {
    color: '#F1F5F9', // light text on dark surface bubble
  },
  // Reply banner in composer
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  replyBannerBar: {
    width: 3,
    height: '100%',
    minHeight: 32,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
    marginRight: 10,
  },
  replyBannerContent: {
    flex: 1,
  },
  replyBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 2,
  },
  replyBannerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  replyBannerClose: {
    padding: 4,
    marginLeft: 8,
  },
  // Report Modal Styles
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  reportModalCloseBtn: {
    padding: 4,
  },
  reportModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  reportReasonsContainer: {
    maxHeight: 280,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  reportReasonContent: {
    flex: 1,
    marginRight: 12,
  },
  reportReasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportReasonDesc: {
    fontSize: 13,
  },
  reportAdditionalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  reportSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reveal Modal Styles
  revealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  revealModalContainer: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  revealModalIcon: {
    marginBottom: 16,
  },
  revealModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  revealModalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  revealModalNote: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  revealBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  revealBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipRevealBtn: {
    paddingVertical: 10,
  },
  skipRevealBtnText: {
    fontSize: 14,
  },
  revealModalHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  revealStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  revealToast: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  revealToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  revealToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  revealStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  revealStatusButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 10,
  },
  revealStatusButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  friendBadgeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  blockedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  blockedModalContainer: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  blockedModalTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  blockedModalTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C1D95',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockedModalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    marginBottom: 12,
  },
  blockedModalIcon: {
    fontSize: 30,
  },
  blockedModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  blockedModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  blockedModalButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  blockedModalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  // Upload progress styles
  // Media viewer styles
  mediaViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  mediaViewerDownloadButton: {
    position: 'absolute',
    top: 50,
    right: 64,
    zIndex: 10,
    padding: 10,
  },
  mediaViewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerPage: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerImage: {
    width: '100%',
    height: '80%',
  },
  mediaViewerVideo: {
    width: '100%',
    height: '80%',
  },
});
