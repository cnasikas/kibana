/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useContext } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiModal,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiModalHeader,
  EuiLoadingSpinner,
  EuiModalHeaderTitle,
  EuiModalBody,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import { useNavigateToManagementMlLink } from '../../../../../../../contexts/kibana/use_create_url';
import { JobCreatorContext } from '../../../job_creator_context';
import type { AdvancedJobCreator } from '../../../../../common/job_creator';
import { resetAdvancedJob } from '../../../../../common/job_creator/util/general';
import type {
  CombinedJob,
  Datafeed,
} from '../../../../../../../../../common/types/anomaly_detection_jobs';
import type { DatafeedValidationResponse } from '../../../../../../../../../common/types/job_validation';

import { useMlKibana, useMlApi } from '../../../../../../../contexts/kibana';

const fixedPageSize: number = 8;

enum STEP {
  PICK_DATA_VIEW,
  VALIDATE,
}

interface Props {
  onClose: () => void;
}

export const ChangeDataViewModal: FC<Props> = ({ onClose }) => {
  const {
    services: {
      data: { dataViews },
      contentManagement,
      uiSettings,
    },
  } = useMlKibana();
  const navigateToMlManagementLink = useNavigateToManagementMlLink('anomaly_detection');
  const { validateDatafeedPreview } = useMlApi();

  const { jobCreator: jc } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;

  const [validating, setValidating] = useState(false);
  const [step, setStep] = useState(STEP.PICK_DATA_VIEW);

  const [currentDataViewTitle, setCurrentDataViewTitle] = useState<string>('');
  const [newDataViewTitle, setNewDataViewTitle] = useState<string>('');
  const [validationResponse, setValidationResponse] = useState<DatafeedValidationResponse | null>(
    null
  );

  const modalTitleId = useGeneratedHtmlId();

  useEffect(function initialPageLoad() {
    setCurrentDataViewTitle(jobCreator.indexPatternTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function stepChange() {
      if (step === STEP.PICK_DATA_VIEW) {
        setValidationResponse(null);
      }
    },
    [step]
  );

  function onDataViewSelected(dataViewId: string) {
    if (validating === false) {
      setStep(STEP.VALIDATE);
      validate(dataViewId);
    }
  }

  const validate = useCallback(
    async (dataViewId: string) => {
      setValidating(true);

      const { title } = await dataViews.get(dataViewId);
      setNewDataViewTitle(title);

      const indices = title.split(',');
      if (jobCreator.detectors.length) {
        const datafeed: Datafeed = { ...jobCreator.datafeedConfig, indices };
        const resp = await validateDatafeedPreview({
          job: {
            ...jobCreator.jobConfig,
            datafeed_config: datafeed,
          } as CombinedJob,
        });
        setValidationResponse(resp);
      }
      setValidating(false);
    },
    [dataViews, validateDatafeedPreview, jobCreator]
  );

  const applyDataView = useCallback(() => {
    const newIndices = newDataViewTitle.split(',');
    jobCreator.indices = newIndices;
    resetAdvancedJob(jobCreator, navigateToMlManagementLink);
  }, [jobCreator, newDataViewTitle, navigateToMlManagementLink]);

  return (
    <>
      <EuiModal
        onClose={onClose}
        data-test-subj="mlJobMgmtImportJobsFlyout"
        aria-labelledby={modalTitleId}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.datafeedStep.dataView.step0.title"
              defaultMessage="Change data view"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {step === STEP.PICK_DATA_VIEW && (
            <>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedStep.dataView.step1.title"
                defaultMessage="Select new data view for the job"
              />

              <EuiSpacer size="s" />

              <SavedObjectFinder
                id="mlJobsDatafeedDataView"
                key="searchSavedObjectFinder"
                onChoose={onDataViewSelected}
                showFilter
                noItemsMessage={i18n.translate(
                  'xpack.ml.newJob.wizard.datafeedStep.dataView.step1.noMatchingError',
                  {
                    defaultMessage: 'No matching data views found.',
                  }
                )}
                savedObjectMetaData={[
                  {
                    type: 'index-pattern',
                    getIconForSavedObject: () => 'indexPatternApp',
                    name: i18n.translate(
                      'xpack.ml.newJob.wizard.datafeedStep.dataView.step1.dataView',
                      {
                        defaultMessage: 'Data view',
                      }
                    ),
                  },
                ]}
                fixedPageSize={fixedPageSize}
                services={{ contentClient: contentManagement.client, uiSettings }}
              />
            </>
          )}
          {step === STEP.VALIDATE && (
            <>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.title"
                defaultMessage="Changing {dv1} for {dv2}"
                values={{ dv1: currentDataViewTitle, dv2: newDataViewTitle }}
              />

              <EuiSpacer size="s" />

              {validating === true ? (
                <>
                  <EuiLoadingSpinner />
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.validatingText"
                    defaultMessage="Checking data view and job compatibility"
                  />
                </>
              ) : (
                <ValidationMessage
                  validationResponse={validationResponse}
                  dataViewTitle={newDataViewTitle}
                />
              )}

              <EuiSpacer size="s" />

              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={setStep.bind(null, STEP.PICK_DATA_VIEW)}
                    isDisabled={validating}
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.backButton"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => applyDataView()}
                    isDisabled={validating}
                    data-test-subj="mlJobsImportButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedStep.dataView.step2.ApplyButton"
                      defaultMessage="Apply"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiModalBody>
      </EuiModal>
    </>
  );
};

const ValidationMessage: FC<{
  validationResponse: DatafeedValidationResponse | null;
  dataViewTitle: string;
}> = ({ validationResponse, dataViewTitle }) => {
  if (validationResponse === null) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.noDetectors.title',
          {
            defaultMessage: 'Data view valid',
          }
        )}
        color="primary"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.noDetectors.message"
          defaultMessage="No detectors have been configured; this data view can be applied to the job."
        />
      </EuiCallOut>
    );
  }
  if (validationResponse.valid === true) {
    if (validationResponse.documentsFound === true) {
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.valid.title',
            {
              defaultMessage: 'Data view valid',
            }
          )}
          color="primary"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.valid.message"
            defaultMessage="This data view can be applied to this job."
          />
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.possiblyInvalid.title',
            {
              defaultMessage: 'Data view possibly invalid',
            }
          )}
          color="warning"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.possiblyInvalid.message"
            defaultMessage="This data view produced no results when previewing the datafeed. There may be no documents in {dataViewTitle}."
            values={{ dataViewTitle }}
          />
        </EuiCallOut>
      );
    }
  } else {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.title',
          {
            defaultMessage: 'Data view invalid',
          }
        )}
        color="danger"
      >
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.message"
          defaultMessage="This data view produced an error when attempting to preview the datafeed. The fields selected for this job might not exist in {dataViewTitle}."
          values={{ dataViewTitle }}
        />

        <EuiSpacer size="s" />

        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.dataView.validation.invalid.reason"
          defaultMessage="Reason:"
        />

        <EuiSpacer size="s" />

        {validationResponse.error ? extractErrorMessage(validationResponse.error) : null}
      </EuiCallOut>
    );
  }
};
