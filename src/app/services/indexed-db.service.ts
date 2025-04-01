import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Email } from '../pages/job-posts/manager/components/data-uploads/bulk-document-uploads/bulk-document-uploads.component';

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private dbName = 'MyDatabase';
  private storeName = 'Hireup';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /** Initialize IndexedDB */
  private initDB(): void {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(this.storeName)) {
        const store = db.createObjectStore(this.storeName, {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex('job_id', 'job_id', { unique: false });
        store.createIndex('email_id', 'email_id', { unique: true });
      }
    };

    request.onsuccess = (event: Event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      console.log("Indexed Db Initialized!")
    };

    request.onerror = (event: Event) => {
      console.error(
        'IndexedDB Error:',
        (event.target as IDBOpenDBRequest).error
      );
    };
  }

  /** Add a new item */
  addItem<T>(data: T): Observable<number> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(data);

      request.onsuccess = () => {
        observer.next(request.result as number);
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Get an item by ID */
  getItem<T>(id: number): Observable<T | undefined> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        observer.next(request.result as T | undefined);
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Get all items */
  getAllItems<T>(): Observable<T[]> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        observer.next(request.result as T[]);
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Update an item */
  updateItem<T extends { id: number }>(data: T): Observable<void> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        observer.next();
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Delete an item */
  deleteItem(id: number): Observable<void> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        observer.next();
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Store an email (Prevents duplicates) */
  addEmail(email: Email): Observable<void> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(email.email_id);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          // Email already exists, reject the operation
          observer.error('Email with this subject already exists');
          return;
        }

        // Convert File objects to Blob
        const processedEmail: Email = {
          ...email,
          attachments: email.attachments.map((att) => ({
            ...att,
            file: att.file
              ? new File([att.file], att.filename, { type: att.file.type })
              : undefined,
          })),
        };

        // Store email in IndexedDB
        const writeTransaction = this.db!.transaction(
          this.storeName,
          'readwrite'
        );
        const writeStore = writeTransaction.objectStore(this.storeName);
        const putRequest = writeStore.put(processedEmail);

        putRequest.onsuccess = () => {
          observer.next();
          observer.complete();
        };

        putRequest.onerror = () => observer.error(putRequest.error);
      };

      getRequest.onerror = () => observer.error(getRequest.error);
    });
  }

  /** Get all emails */
  getAllEmails(): Observable<Email[]> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => observer.next(request.result);
      request.onerror = () => observer.error(request.error);
    });
  }

  /** Get all emails under the same job ID */
  getEmailsByJobId(jobId: string): Observable<Email[]> {
    return new Observable((observer) => {
      console.log("Fetching emails with Job Id: ", jobId)
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }
      

      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('job_id');
      const request = index.getAll(jobId);

      request.onsuccess = () => observer.next(request.result);
      request.onerror = () => observer.error(request.error);
    });
  }

  /** Update an existing email */
  updateEmail(email: Email): Observable<void> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

    
      console.log("Updating email with Id: ", email.email_id)

      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('email_id');
      const getRequest = index.get(email.email_id);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          observer.error('Email not found');
          return;
        }

        // Convert File to Blob before storing
        const updatedEmail: Email = {
          ...email,
          attachments: email.attachments.map((att) => ({
            ...att,
            file: att.file
              ? new File([att.file], att.filename, { type: att.file.type })
              : undefined,
          })),
        };

        console.log(updatedEmail)

        const putRequest = store.put(updatedEmail);
        putRequest.onsuccess = () => {
          observer.next();
          observer.complete();
        };
        putRequest.onerror = () => observer.error(putRequest.error);
      };

      getRequest.onerror = () => observer.error(getRequest.error);
    });
  }

  /** Retrieve an email (Convert Blob back to File) */
  getEmail(subject: string): Observable<Email | undefined> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(subject);

      request.onsuccess = () => {
        const result = request.result as Email | undefined;

        if (result) {
          // Convert Blob back to File
          result.attachments = result.attachments.map((att) => ({
            ...att,
            file: att.file
              ? new File([att.file as Blob], att.filename, {
                  type: (att.file as Blob).type,
                })
              : undefined,
          }));
        }

        observer.next(result);
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }

  /** Delete an email */
  deleteEmail(subject: string): Observable<void> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(subject);

      request.onsuccess = () => {
        observer.next();
        observer.complete();
      };

      request.onerror = () => observer.error(request.error);
    });
  }
}
