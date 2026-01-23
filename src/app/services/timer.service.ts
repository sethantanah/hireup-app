import { Injectable } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimerService {
    private timers: Map<string, {
        endTime: number;
        intervalId: any;
        callback: () => void;
    }> = new Map();

    constructor(@Inject(PLATFORM_ID) private platformId: any) { }

    startTimer(key: string, durationSeconds: number, onComplete: () => void): void {
        if (!isPlatformBrowser(this.platformId)) return;

        this.clearTimer(key);

        const endTime = Date.now() + (durationSeconds * 1000);

        const timerId = setInterval(() => {
            const remaining = Math.max(0, endTime - Date.now());

            if (remaining <= 0) {
                this.clearTimer(key);
                onComplete();
            }
        }, 1000);

        this.timers.set(key, {
            endTime,
            intervalId: timerId,
            callback: onComplete
        });

        // Persist for page refresh recovery
        localStorage.setItem(`timer_${key}`, JSON.stringify({
            endTime,
            durationSeconds,
            startedAt: Date.now()
        }));
    }

    resumeTimer(key: string, onComplete: () => void): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;

        const stored = localStorage.getItem(`timer_${key}`);
        if (stored) {
            const data = JSON.parse(stored);
            const elapsed = Math.floor((Date.now() - data.startedAt) / 1000);
            const remaining = Math.max(0, data.durationSeconds - elapsed);

            if (remaining > 0) {
                this.startTimer(key, remaining, onComplete);
                return true;
            } else {
                onComplete();
                return false;
            }
        }
        return false;
    }

    clearTimer(key: string): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const timer = this.timers.get(key);
        if (timer) {
            clearInterval(timer.intervalId);
            localStorage.removeItem(`timer_${key}`);
            this.timers.delete(key);
        }
    }
}