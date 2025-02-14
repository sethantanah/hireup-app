import { TestBed } from '@angular/core/testing';

import { JobpostingsApiService } from './jobpostings-api.service';

describe('JobpostingsApiService', () => {
  let service: JobpostingsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobpostingsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
