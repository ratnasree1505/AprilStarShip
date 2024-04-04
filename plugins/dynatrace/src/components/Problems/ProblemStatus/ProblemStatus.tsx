import React from 'react';
import { DynatraceProblem } from '../../../api/DynatraceApi';
import { StatusError, StatusOK } from '@backstage/core-components';

export const ProblemStatus = ({ status }: Partial<DynatraceProblem>) => {
  switch (status?.toLocaleLowerCase()) {
    case 'open':
      return (
        <>
          <StatusError />
          Open
        </>
      );
    case 'closed':
      return (
        <>
          <StatusOK />
          Closed
        </>
      );
    default:
      return <></>;
  }
};
