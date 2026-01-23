import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class TestSyncService {
    private dbName = 'TestResultsDB';
    private storeName = 'pendingTests';

    constructor(@Inject(PLATFORM_ID) private platformId: any) {
        if (isPlatformBrowser(this.platformId)) {
            this.initDatabase();
        }
    }

    private async initDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async saveOfflineTest(testData: any): Promise<number> {
        if (!isPlatformBrowser(this.platformId)) return -1;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onsuccess = (event: any) => {
                const db = event.target.result;
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const addRequest = store.add({
                    ...testData,
                    savedAt: new Date().toISOString(),
                    status: 'pending'
                });

                addRequest.onsuccess = () => resolve(addRequest.result);
                addRequest.onerror = () => reject(addRequest.error);
            };

            request.onerror = () => reject(request.error);
        });
    }
}