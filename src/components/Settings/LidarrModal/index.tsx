import Modal from '@app/components/Common/Modal';
import SensitiveInput from '@app/components/Common/SensitiveInput';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { isValidURL } from '@app/utils/urlValidationHelper';
import { Transition } from '@headlessui/react';
import type { LidarrSettings } from '@server/lib/settings';
import axios from 'axios';
import { Field, Formik } from 'formik';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Select from 'react-select';
import { useToasts } from 'react-toast-notifications';
import * as Yup from 'yup';

type OptionType = {
  value: number;
  label: string;
};

export interface LidarrTestResponse {
  profiles: { id: number; name: string }[];
  metadataProfiles: { id: number; name: string }[];
  rootFolders: { id: number; path: string }[];
  tags: { id: number; label: string }[];
  urlBase?: string;
}

const messages = defineMessages('components.Settings.LidarrModal', {
  createlidarr: 'Add New Lidarr Server',
  editlidarr: 'Edit Lidarr Server',
  validationNameRequired: 'You must provide a server name',
  validationHostnameRequired: 'You must provide a valid hostname or IP address',
  validationPortRequired: 'You must provide a valid port number',
  validationApiKeyRequired: 'You must provide an API key',
  validationRootFolderRequired: 'You must select a root folder',
  validationProfileRequired: 'You must select a quality profile',
  validationMetadataProfileRequired: 'You must select a metadata profile',
  toastLidarrTestSuccess: 'Lidarr connection established successfully!',
  toastLidarrTestFailure: 'Failed to connect to Lidarr.',
  add: 'Add Server',
  defaultserver: 'Default Server',
  servername: 'Server Name',
  hostname: 'Hostname or IP Address',
  port: 'Port',
  ssl: 'Use SSL',
  apiKey: 'API Key',
  baseUrl: 'URL Base',
  syncEnabled: 'Enable Scan',
  externalUrl: 'External URL',
  qualityprofile: 'Quality Profile',
  metadataprofile: 'Metadata Profile',
  rootfolder: 'Root Folder',
  selectQualityProfile: 'Select quality profile',
  selectMetadataProfile: 'Select metadata profile',
  selectRootFolder: 'Select root folder',
  loadingprofiles: 'Loading quality profiles…',
  testFirstQualityProfiles: 'Test connection to load quality profiles',
  loadingMetadataProfiles: 'Loading metadata profiles…',
  testFirstMetadataProfiles: 'Test connection to load metadata profiles',
  loadingrootfolders: 'Loading root folders…',
  testFirstRootFolders: 'Test connection to load root folders',
  loadingTags: 'Loading tags…',
  testFirstTags: 'Test connection to load tags',
  tags: 'Tags',
  enableSearch: 'Enable Automatic Search',
  tagRequests: 'Tag Requests',
  tagRequestsInfo:
    "Automatically add an additional tag with the requester's user ID & display name",
  validationApplicationUrl: 'You must provide a valid URL',
  validationApplicationUrlTrailingSlash: 'URL must not end in a trailing slash',
  validationBaseUrlLeadingSlash: 'URL base must have a leading slash',
  validationBaseUrlTrailingSlash: 'URL base must not end in a trailing slash',
  notagoptions: 'No tags.',
  selecttags: 'Select tags',
});

interface LidarrModalProps {
  lidarr: LidarrSettings | null;
  onClose: () => void;
  onSave: () => void;
}

const LidarrModal = ({ onClose, lidarr, onSave }: LidarrModalProps) => {
  const intl = useIntl();
  const initialLoad = useRef(false);
  const { addToast } = useToasts();
  const [isValidated, setIsValidated] = useState(lidarr ? true : false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<LidarrTestResponse>({
    profiles: [],
    metadataProfiles: [],
    rootFolders: [],
    tags: [],
  });

  const LidarrSettingsSchema = Yup.object().shape({
    name: Yup.string().required(
      intl.formatMessage(messages.validationNameRequired)
    ),
    hostname: Yup.string().required(
      intl.formatMessage(messages.validationHostnameRequired)
    ),
    port: Yup.number().required(
      intl.formatMessage(messages.validationPortRequired)
    ),
    apiKey: Yup.string().required(
      intl.formatMessage(messages.validationApiKeyRequired)
    ),
    activeProfileId: Yup.number()
      .nullable()
      .required(intl.formatMessage(messages.validationProfileRequired)),
    activeDirectory: Yup.string().required(
      intl.formatMessage(messages.validationRootFolderRequired)
    ),
    externalUrl: Yup.string()
      .optional()
      .nullable()
      .test('valid-url', intl.formatMessage(messages.validationApplicationUrl), (value) =>
        !value ? true : isValidURL(value)
      )
      .test(
        'no-trailing-slash',
        intl.formatMessage(messages.validationApplicationUrlTrailingSlash),
        (value) => !value || !value.endsWith('/')
      ),
    baseUrl: Yup.string()
      .optional()
      .nullable()
      .test(
        'leading-slash',
        intl.formatMessage(messages.validationBaseUrlLeadingSlash),
        (value) => !value || value.startsWith('/')
      )
      .test(
        'no-trailing-slash',
        intl.formatMessage(messages.validationBaseUrlTrailingSlash),
        (value) => !value || !value.endsWith('/')
      ),
  });

  const testLidarrConnection = useCallback(
    async ({
      hostname,
      port,
      apiKey,
      baseUrl,
      useSsl,
    }: {
      hostname: string;
      port: number;
      apiKey: string;
      baseUrl?: string;
      useSsl: boolean;
    }) => {
      setIsTesting(true);
      try {
        const response = await axios.post<LidarrTestResponse>(
          '/api/v1/settings/lidarr/test',
          {
            hostname,
            apiKey,
            port: Number(port),
            baseUrl,
            useSsl,
          }
        );

        setIsValidated(true);
        setTestResponse(response.data);

        if (!initialLoad.current) {
          addToast(intl.formatMessage(messages.toastLidarrTestSuccess), {
            appearance: 'success',
            autoDismiss: true,
          });
        }
      } catch {
        setIsValidated(false);
        if (!initialLoad.current) {
          addToast(intl.formatMessage(messages.toastLidarrTestFailure), {
            appearance: 'error',
            autoDismiss: true,
          });
        }
      } finally {
        setIsTesting(false);
        initialLoad.current = false;
      }
    },
    [addToast, intl]
  );

  useEffect(() => {
    if (lidarr) {
      initialLoad.current = true;
      testLidarrConnection({
        hostname: lidarr.hostname,
        port: lidarr.port,
        apiKey: lidarr.apiKey,
        baseUrl: lidarr.baseUrl,
        useSsl: lidarr.useSsl,
      });
    }
  }, [lidarr, testLidarrConnection]);

  return (
    <Formik
      initialValues={{
        name: lidarr?.name ?? '',
        hostname: lidarr?.hostname ?? '',
        port: lidarr?.port ?? 8686,
        ssl: lidarr?.useSsl ?? false,
        apiKey: lidarr?.apiKey ?? '',
        baseUrl: lidarr?.baseUrl ?? '',
        activeProfileId: lidarr?.activeProfileId ?? null,
        activeProfileName: lidarr?.activeProfileName ?? '',
        metadataProfileId: lidarr?.metadataProfileId ?? null,
        metadataProfileName: lidarr?.metadataProfileName ?? '',
        activeDirectory: lidarr?.activeDirectory ?? '',
        isDefault: lidarr?.isDefault ?? false,
        externalUrl: lidarr?.externalUrl ?? '',
        syncEnabled: lidarr?.syncEnabled ?? false,
        preventSearch: lidarr?.preventSearch ?? false,
        tagRequests: lidarr?.tagRequests ?? false,
        tags: lidarr?.tags ?? [],
      }}
      validationSchema={LidarrSettingsSchema}
      onSubmit={async (values) => {
        try {
          const submitData: Partial<LidarrSettings> = {
            name: values.name,
            hostname: values.hostname,
            port: Number(values.port),
            useSsl: values.ssl,
            apiKey: values.apiKey,
            baseUrl: values.baseUrl,
            activeProfileId: Number(values.activeProfileId),
            activeProfileName: values.activeProfileName,
            metadataProfileId: Number(values.metadataProfileId),
            metadataProfileName: values.metadataProfileName,
            activeDirectory: values.activeDirectory,
            isDefault: values.isDefault,
            is4k: false,
            externalUrl: values.externalUrl,
            syncEnabled: values.syncEnabled,
            preventSearch: values.preventSearch,
            tagRequests: values.tagRequests,
            tags: values.tags,
            overrideRule: [],
          };

          if (lidarr) {
            await axios.put(`/api/v1/settings/lidarr/${lidarr.id}`, submitData);
          } else {
            await axios.post('/api/v1/settings/lidarr', submitData);
          }
          onSave();
        } catch {
          // handled by toasts
        }
      }}
    >
      {({
        errors,
        touched,
        values,
        handleSubmit,
        setFieldValue,
        isSubmitting,
      }) => {
        const profileOptions: OptionType[] = testResponse.profiles.map((p) => ({
          value: p.id,
          label: p.name,
        }));
        const metadataProfileOptions: OptionType[] = testResponse.metadataProfiles.map(
          (p) => ({ value: p.id, label: p.name })
        );
        const folderOptions: OptionType[] = testResponse.rootFolders.map((f) => ({
          value: f.id,
          label: f.path,
        }));
        const tagOptions: OptionType[] = testResponse.tags.map((t) => ({
          value: t.id,
          label: t.label,
        }));

        return (
          <Modal
            onCancel={onClose}
            okButtonType="primary"
            okText={
              isSubmitting
                ? intl.formatMessage(globalMessages.saving)
                : lidarr
                  ? intl.formatMessage(globalMessages.save)
                  : intl.formatMessage(messages.add)
            }
            secondaryButtonType="warning"
            secondaryText={
              isTesting
                ? intl.formatMessage(globalMessages.testing)
                : intl.formatMessage(globalMessages.test)
            }
            onSecondary={() => {
              testLidarrConnection({
                hostname: values.hostname,
                port: values.port,
                apiKey: values.apiKey,
                baseUrl: values.baseUrl,
                useSsl: values.ssl,
              });
            }}
            secondaryDisabled={
              !values.hostname ||
              !values.port ||
              !values.apiKey ||
              isTesting
            }
            okDisabled={!isValidated || isSubmitting}
            onOk={() => handleSubmit()}
            title={intl.formatMessage(
              lidarr ? messages.editlidarr : messages.createlidarr
            )}
          >
            <div className="mb-6">
              {/* Server Name */}
              <div className="form-row">
                <label htmlFor="name" className="text-label">
                  {intl.formatMessage(messages.servername)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Lidarr"
                    />
                  </div>
                  {errors.name && touched.name && (
                    <div className="error">{errors.name}</div>
                  )}
                </div>
              </div>

              {/* Default server */}
              <div className="form-row">
                <label htmlFor="isDefault" className="text-label">
                  {intl.formatMessage(messages.defaultserver)}
                </label>
                <div className="form-input-area">
                  <Field
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                  />
                </div>
              </div>

              {/* Hostname */}
              <div className="form-row">
                <label htmlFor="hostname" className="text-label">
                  {intl.formatMessage(messages.hostname)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Field
                      id="hostname"
                      name="hostname"
                      type="text"
                      placeholder="127.0.0.1"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setIsValidated(false);
                        setFieldValue('hostname', e.target.value);
                      }}
                    />
                  </div>
                  {errors.hostname && touched.hostname && (
                    <div className="error">{errors.hostname}</div>
                  )}
                </div>
              </div>

              {/* Port */}
              <div className="form-row">
                <label htmlFor="port" className="text-label">
                  {intl.formatMessage(messages.port)}
                </label>
                <div className="form-input-area">
                  <Field id="port" name="port" type="number" placeholder="8686" />
                  {errors.port && touched.port && (
                    <div className="error">{String(errors.port)}</div>
                  )}
                </div>
              </div>

              {/* SSL */}
              <div className="form-row">
                <label htmlFor="ssl" className="text-label">
                  {intl.formatMessage(messages.ssl)}
                </label>
                <div className="form-input-area">
                  <Field type="checkbox" id="ssl" name="ssl" />
                </div>
              </div>

              {/* API Key */}
              <div className="form-row">
                <label htmlFor="apiKey" className="text-label">
                  {intl.formatMessage(messages.apiKey)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <SensitiveInput
                      as="field"
                      id="apiKey"
                      name="apiKey"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setIsValidated(false);
                        setFieldValue('apiKey', e.target.value);
                      }}
                    />
                  </div>
                  {errors.apiKey && touched.apiKey && (
                    <div className="error">{errors.apiKey}</div>
                  )}
                </div>
              </div>

              {/* Base URL */}
              <div className="form-row">
                <label htmlFor="baseUrl" className="text-label">
                  {intl.formatMessage(messages.baseUrl)}
                </label>
                <div className="form-input-area">
                  <Field id="baseUrl" name="baseUrl" type="text" placeholder="/lidarr" />
                  {errors.baseUrl && touched.baseUrl && (
                    <div className="error">{errors.baseUrl}</div>
                  )}
                </div>
              </div>

              {/* Quality Profile */}
              <div className="form-row">
                <label htmlFor="activeProfileId" className="text-label">
                  {intl.formatMessage(messages.qualityprofile)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Select<OptionType>
                      inputId="activeProfileId"
                      isDisabled={!isValidated}
                      options={profileOptions}
                      placeholder={
                        isValidated
                          ? intl.formatMessage(messages.selectQualityProfile)
                          : intl.formatMessage(messages.testFirstQualityProfiles)
                      }
                      isLoading={isTesting}
                      value={
                        profileOptions.find((o) => o.value === values.activeProfileId) ??
                        null
                      }
                      onChange={(selected) => {
                        setFieldValue('activeProfileId', selected?.value ?? null);
                        setFieldValue('activeProfileName', selected?.label ?? '');
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                  {errors.activeProfileId && touched.activeProfileId && (
                    <div className="error">{String(errors.activeProfileId)}</div>
                  )}
                </div>
              </div>

              {/* Metadata Profile */}
              <div className="form-row">
                <label htmlFor="metadataProfileId" className="text-label">
                  {intl.formatMessage(messages.metadataprofile)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Select<OptionType>
                      inputId="metadataProfileId"
                      isDisabled={!isValidated}
                      options={metadataProfileOptions}
                      placeholder={
                        isValidated
                          ? intl.formatMessage(messages.selectMetadataProfile)
                          : intl.formatMessage(messages.testFirstMetadataProfiles)
                      }
                      isLoading={isTesting}
                      value={
                        metadataProfileOptions.find(
                          (o) => o.value === values.metadataProfileId
                        ) ?? null
                      }
                      onChange={(selected) => {
                        setFieldValue('metadataProfileId', selected?.value ?? null);
                        setFieldValue('metadataProfileName', selected?.label ?? '');
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                  {errors.metadataProfileId && touched.metadataProfileId && (
                    <div className="error">{String(errors.metadataProfileId)}</div>
                  )}
                </div>
              </div>

              {/* Root Folder */}
              <div className="form-row">
                <label htmlFor="activeDirectory" className="text-label">
                  {intl.formatMessage(messages.rootfolder)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Select<OptionType>
                      inputId="activeDirectory"
                      isDisabled={!isValidated}
                      options={folderOptions}
                      placeholder={
                        isValidated
                          ? intl.formatMessage(messages.selectRootFolder)
                          : intl.formatMessage(messages.testFirstRootFolders)
                      }
                      isLoading={isTesting}
                      value={
                        folderOptions.find(
                          (o) => o.label === values.activeDirectory
                        ) ?? null
                      }
                      onChange={(selected) => {
                        setFieldValue('activeDirectory', selected?.label ?? '');
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                  {errors.activeDirectory && touched.activeDirectory && (
                    <div className="error">{errors.activeDirectory}</div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="form-row">
                <label htmlFor="tags" className="text-label">
                  {intl.formatMessage(messages.tags)}
                </label>
                <div className="form-input-area">
                  <div className="form-input-field">
                    <Select<OptionType, true>
                      isMulti
                      inputId="tags"
                      isDisabled={!isValidated}
                      options={tagOptions}
                      placeholder={
                        isValidated
                          ? intl.formatMessage(messages.selecttags)
                          : intl.formatMessage(messages.testFirstTags)
                      }
                      isLoading={isTesting}
                      noOptionsMessage={() =>
                        intl.formatMessage(messages.notagoptions)
                      }
                      value={tagOptions.filter((o) =>
                        (values.tags ?? []).includes(o.value)
                      )}
                      onChange={(selected) => {
                        setFieldValue(
                          'tags',
                          selected ? selected.map((s) => s.value) : []
                        );
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              </div>

              {/* External URL */}
              <div className="form-row">
                <label htmlFor="externalUrl" className="text-label">
                  {intl.formatMessage(messages.externalUrl)}
                </label>
                <div className="form-input-area">
                  <Field
                    id="externalUrl"
                    name="externalUrl"
                    type="text"
                    placeholder="https://lidarr.example.com"
                  />
                  {errors.externalUrl && touched.externalUrl && (
                    <div className="error">{errors.externalUrl}</div>
                  )}
                </div>
              </div>

              {/* Sync / Search toggles */}
              <div className="form-row">
                <label htmlFor="syncEnabled" className="text-label">
                  {intl.formatMessage(messages.syncEnabled)}
                </label>
                <div className="form-input-area">
                  <Field type="checkbox" id="syncEnabled" name="syncEnabled" />
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="preventSearch" className="text-label">
                  {intl.formatMessage(messages.enableSearch)}
                </label>
                <div className="form-input-area">
                  <Transition
                    show
                    enter="transition-opacity duration-150"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Field
                      type="checkbox"
                      id="preventSearch"
                      name="preventSearch"
                    />
                  </Transition>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="tagRequests" className="text-label">
                  {intl.formatMessage(messages.tagRequests)}
                  <span className="label-tip">
                    {intl.formatMessage(messages.tagRequestsInfo)}
                  </span>
                </label>
                <div className="form-input-area">
                  <Field type="checkbox" id="tagRequests" name="tagRequests" />
                </div>
              </div>
            </div>
          </Modal>
        );
      }}
    </Formik>
  );
};

export default LidarrModal;
