import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { RiUserFollowLine } from 'react-icons/ri';
import * as Drawer from '@/components/ui/drawer';
import * as Button from '@/components/ui/button';
import { getCenterListThunk } from '@/redux/centerSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  fetchPurposeOfVisitListThunk,
  fetchSourceListThunk,
  fetchSupervisorListThunk,
  fetchVmsListviewThunk,
  getClientListThunk,
  getVendorListThunk,
  inviteVisitorThunk,
  salesPersonListThunk,
} from '@/redux/vmsSlice';
import { getVmsInviteResolver } from '@/components/vms/vms-invite-form-schemas';
import { buildInvitePayload } from '@/components/vms/vms-invite-payload';
import {
  SpaceChannelPartnerFields,
  SpaceDetailsSection,
  SpaceDirectFields,
  SpaceInquiryTypeToggle,
  VendorOnlyFields,
  VisitDetailsAndNotes,
  VisitorAndVendorCommonFields,
} from '@/components/vms/vms-invite-form-sections';
import * as Divider from '@/components/ui/divider';

/** Default values use Visitor Entry fieldnames (snake_case). */
const defaultFormValues = {
  inquiry_type: 'direct',
  cp_type: 'Digital',
  cp_company_legal_name: '',
  book_meeting_room: false,
  whom_to_meet: 'devx',
};

const VmsInviteDrawer = ({ open, onOpenChange, inviteTitle, activeTab, onSuccess }) => {
  const [materialCarrying, setMaterialCarrying] = useState('no');

  const dispatch = useDispatch();
  const { data: centerListData } = useSelector((state) => state.center.centerListData);
  const purposeOfVisitListData = useSelector((state) => state.vms.purposeOfVisitList?.data?.data);
  const vendorListData = useSelector((state) => state.vms.vendorList.data?.data);
  const salesPersonListData = useSelector(
    (state) => state.vms.salesPersonList?.data?.message?.results,
  );
  const supervisorListData = useSelector(
    (state) => state.vms.supervisorList?.data?.message?.results,
  );
  const leadSourceListData = useSelector((state) => state.vms.sourceList?.data?.data);
  const clientListData = useSelector((state) => state.vms.clientList?.data?.data);

  const resolver = useMemo(() => getVmsInviteResolver(activeTab), [activeTab]);

  const {
    handleSubmit,
    register,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: defaultFormValues,
  });

  const inquiry_type = watch('inquiry_type');
  const whomToMeet = watch('whom_to_meet');
  const selectedPurposeOfVisit = watch('purpose_of_visit');

  const resetFormForTab = useCallback(() => {
    reset({ ...defaultFormValues });
  }, [reset]);

  useEffect(() => {
    if (!open) {
      resetFormForTab();
      return;
    }
    dispatch(getCenterListThunk({ keyword: '', filters: [], pageSize: 999 })).catch(() => {});
    dispatch(getVendorListThunk()).catch(() => {});
    dispatch(salesPersonListThunk()).catch(() => {});
    dispatch(fetchSupervisorListThunk()).catch(() => {});
    dispatch(fetchSourceListThunk()).catch(() => {});
    dispatch(fetchPurposeOfVisitListThunk()).catch(() => {});
    dispatch(getClientListThunk()).catch(() => {});
    resetFormForTab();
    setMaterialCarrying('no');
  }, [open, activeTab, dispatch, resetFormForTab]);

  const onSubmit = async (data) => {
    try {
      const payload = buildInvitePayload({
        activeTab,
        formData: data,
        materialCarrying,
      });
      await dispatch(inviteVisitorThunk(payload)).unwrap();
      if (onSuccess) {
        onSuccess();
      } else {
        await dispatch(
          fetchVmsListviewThunk({ type: payload?.type || 'Visitor', page: 1 }),
        ).unwrap();
      }
      showSuccessToast('Visitor Invited Successfully.');
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to invite visitor. Please try again.' });
    }
  };

  const isSpace = activeTab === 'space-inquiries';
  const isSpaceDirect = isSpace && inquiry_type === 'direct';
  const isSpaceCp = isSpace && inquiry_type === 'channel-partner';
  const showVisitorVendorEvent =
    activeTab === 'visitors' || activeTab === 'vendors' || activeTab === 'event-participants';

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className='flex max-w-[536px] flex-col'>
        <Drawer.Header className='sticky top-0 z-10 bg-white'>
          <div className='flex items-center gap-3 px-6 py-5'>
            <div className='rounded-full border border-stroke-soft-200 p-2.5'>
              <RiUserFollowLine size={24} />
            </div>
            <div className='flex flex-col gap-1'>
              <Drawer.Title className='label-medium text-text-main-900'>{inviteTitle}</Drawer.Title>
              <p className='paragraph-small text-text-sub-500'>
                Invite details will be configured here.
              </p>
            </div>
          </div>
        </Drawer.Header>

        <Drawer.Body className='overflow-y-auto flex flex-col'>
          <div className='flex flex-col items-stretch px-8 py-5'>
            {isSpace && (
              <SpaceInquiryTypeToggle
                inquiryType={inquiry_type || 'direct'}
                onInquiryTypeChange={(v) =>
                  setValue('inquiry_type', v, { shouldValidate: true, shouldDirty: true })
                }
              />
            )}

            {showVisitorVendorEvent ? (
              <>
                <VisitorAndVendorCommonFields
                  activeTab={activeTab}
                  register={register}
                  control={control}
                  errors={errors}
                  purposeOfVisitListData={purposeOfVisitListData}
                  clientListData={clientListData}
                  centerListData={centerListData}
                  selectedPurposeOfVisit={selectedPurposeOfVisit}
                  whomToMeet={whomToMeet}
                  setValue={setValue}
                />
                <Divider.Root className='my-5' />
                {activeTab === 'vendors' && (
                  <VendorOnlyFields
                    register={register}
                    control={control}
                    errors={errors}
                    vendorListData={vendorListData}
                    supervisorListData={supervisorListData}
                    materialCarrying={materialCarrying}
                    setMaterialCarrying={setMaterialCarrying}
                  />
                )}
              </>
            ) : null}

            {isSpaceDirect && (
              <>
                <SpaceDirectFields
                  register={register}
                  control={control}
                  errors={errors}
                  watch={watch}
                  centerListData={centerListData}
                  leadSourceListData={leadSourceListData}
                  salesPersonListData={salesPersonListData}
                />
                <Divider.Root className='my-5' />
                <SpaceDetailsSection register={register} control={control} errors={errors} />
              </>
            )}

            {isSpaceCp && (
              <>
                <SpaceChannelPartnerFields
                  register={register}
                  control={control}
                  errors={errors}
                  centerListData={centerListData}
                  salesPersonListData={salesPersonListData}
                />
                <Divider.Root className='my-5' />
                <SpaceDetailsSection register={register} control={control} errors={errors} />
              </>
            )}
            {activeTab !== 'visitors' && <Divider.Root className='my-5' />}

            <VisitDetailsAndNotes
              control={control}
              errors={errors}
              register={register}
              activeTab={activeTab}
            />
          </div>
        </Drawer.Body>

        <Drawer.Footer className='sticky bottom-0 border-t border-stroke-soft-200 z-10 bg-white'>
          <div className='flex flex-col gap-3 p-6 sm:flex-row sm:justify-end'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full sm:w-auto'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='button'
              size='small'
              className='w-full sm:w-auto'
              onClick={handleSubmit(onSubmit)}
            >
              Invite
            </Button.Root>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default VmsInviteDrawer;
