import { TestBed } from '@angular/core/testing';

import { JobtestApiService } from './jobtest-api.service';

describe('JobtestApiService', () => {
  let service: JobtestApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobtestApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
