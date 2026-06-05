/**
 * Track scroll edge state to decide whether to pass wheel/touch events to parent.
 * Uses getter functions instead of React refs to always read fresh values from closures.
 */
export function useOriginScroll(
  getIsScrollAtTop: () => boolean,
  getIsScrollAtBottom: () => boolean,
  getIsScrollAtLeft: () => boolean,
  getIsScrollAtRight: () => boolean,
) {
  let lockRef = false;
  let lockTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  function lockScroll() {
    if (lockTimeoutRef !== null) clearTimeout(lockTimeoutRef);
    lockRef = true;
    lockTimeoutRef = setTimeout(() => {
      lockRef = false;
    }, 50);
  }

  return (isHorizontal: boolean, delta: number, smoothOffset = false) => {
    const originScroll = isHorizontal
      ? (delta < 0 && getIsScrollAtLeft()) || (delta > 0 && getIsScrollAtRight())
      : (delta < 0 && getIsScrollAtTop()) || (delta > 0 && getIsScrollAtBottom());

    if (smoothOffset && originScroll) {
      if (lockTimeoutRef !== null) clearTimeout(lockTimeoutRef);
      lockRef = false;
    } else if (!originScroll || lockRef) {
      lockScroll();
    }

    return !lockRef && originScroll;
  };
}
