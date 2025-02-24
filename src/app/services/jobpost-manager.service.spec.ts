import { TestBed } from '@angular/core/testing';

import { JobpostManagerService } from './jobpost-manager.service';

describe('JobpostManagerService', () => {
  let service: JobpostManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobpostManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
