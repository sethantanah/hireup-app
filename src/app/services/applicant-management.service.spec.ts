import { TestBed } from '@angular/core/testing';

import { ApplicantManagementService } from './applicant-management.service';

describe('ApplicantManagementService', () => {
  let service: ApplicantManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApplicantManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
