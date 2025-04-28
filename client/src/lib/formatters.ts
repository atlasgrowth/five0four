// Format price from cents to dollars
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format time from seconds to minutes and seconds
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${seconds} sec`;
  } else if (remainingSeconds === 0) {
    return `${minutes} min`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Format location (floor and bay)
export function formatLocation(floor: number, bay: number): string {
  return `F${floor}-B${bay}`;
}

// Format cook time
export function formatCookTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min cook time`;
}

// Calculate ETA based on longest cook time
export function calculateETA(cookSeconds: number): number {
  // ETA = max cook time + 120 sec prep + 120 sec expo
  return cookSeconds + 240; // Adding 4 minutes for prep and expo
}

// Format timer display (mm:ss)
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Determine timer status based on remaining time vs total time
export function getTimerStatus(remainingSeconds: number, totalSeconds: number): 'normal' | 'warning' | 'danger' {
  const percentComplete = (totalSeconds - remainingSeconds) / totalSeconds;
  
  if (percentComplete >= 0.9) {
    return 'danger';
  } else if (percentComplete >= 0.8) {
    return 'warning';
  }
  return 'normal';
}
