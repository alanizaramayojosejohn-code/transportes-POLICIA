import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { AuditLogFilter, AuditLogPage, AuditSummary } from './audit.model';

const AUDIT_LOGS_QUERY = gql`
  query AuditLogs(
    $search: String
    $module: String
    $action: AuditAction
    $date: String
    $skip: Int
    $take: Int
  ) {
    auditLogs(
      search: $search
      module: $module
      action: $action
      date: $date
      skip: $skip
      take: $take
    ) {
      total
      items {
        id
        action
        entity
        entityId
        entityLabel
        module
        description
        after
        ipAddress
        userAgent
        createdAt
        user {
          id
          username
          fullName
        }
      }
    }
  }
`;

const AUDIT_SUMMARY_QUERY = gql`
  query AuditSummary {
    auditSummary {
      total
      today
      created
      updated
    }
  }
`;

interface AuditLogsResult {
  auditLogs: AuditLogPage;
}

interface AuditSummaryResult {
  auditSummary: AuditSummary;
}

const EMPTY_PAGE: AuditLogPage = { items: [], total: 0 };
const EMPTY_SUMMARY: AuditSummary = { total: 0, today: 0, created: 0, updated: 0 };

/**
 * Bitácora de auditoría (spec 019). Sólo lectura: el módulo no expone
 * mutations, así que este servicio no tiene métodos de escritura.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: AuditLogFilter): Observable<AuditLogPage> {
    return this.apollo
      .watchQuery<AuditLogsResult>({
        query: AUDIT_LOGS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => (result.data?.auditLogs as AuditLogPage) ?? EMPTY_PAGE));
  }

  summary(): Observable<AuditSummary> {
    return this.apollo
      .watchQuery<AuditSummaryResult>({
        query: AUDIT_SUMMARY_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.auditSummary as AuditSummary) ?? EMPTY_SUMMARY),
      );
  }
}
