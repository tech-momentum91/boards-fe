import React, { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  RiBuildingLine,
  RiErrorWarningFill,
  RiGlobalLine,
  RiFileTextLine,
  RiInformationFill,
} from 'react-icons/ri';
import CardLayout from '@/components/card-layout';
import logoImage from '@/assets/images/avatar_image_2x.png';
import * as Button from '@/components/ui/button';
import * as Label from '@/components/ui/label';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Hint from '@/components/ui/hint';
import {
  getCompanyAndUserProfile,
  uploadProfileImageUser,
  deleteFileByUrl,
  updateCompanyProfileThunk,
} from '@/redux/profileSlice';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';

const companyProfileSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  websiteUrl: z.string().optional(),
  companyDescription: z.string().optional(),
});

const CompanyProfile = () => {
  const dispatch = useDispatch();
  const { profileData } = useSelector((state) => state.profile);
  const fileInputRef = useRef(null);

  const { companyProfile } = useSelector((state) => state.profile);
  const isLoading = companyProfile?.isLoading || false;
  const error = companyProfile?.error || null;

  const editable = companyProfile?.data?.message?.editable;
  // Normalize editable to boolean (handle both boolean true and string "true")
  const isEditable = editable == true || editable == 'true';

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: '',
      websiteUrl: 'https://devx.com',
      companyDescription: 'DevX bio test',
    },
  });

  const onSubmit = async (data) => {
    if (!isEditable) {
      return;
    }

    try {
      const payload = {
        company_description: data.companyDescription || '',
        company_website: data.websiteUrl || '',
      };

      await dispatch(updateCompanyProfileThunk(payload)).unwrap();

      // Refresh company profile to get updated data
      if (profileData.email) {
        await dispatch(getCompanyAndUserProfile(profileData.email));
      }

      showSuccessToast('Company profile updated successfully.');
    } catch (error) {
      showErrorToast(error, {
        defaultMessage: 'Failed to update company profile. Please try again.',
      });
    }
  };

  // Track the last email we fetched to prevent infinite loops
  const lastFetchedEmailRef = useRef(null);
  const hasAttemptedFetchRef = useRef(false);
  const isInitializedRef = useRef(false);
  const inFlightRef = useRef(false);
  const failedOnceRef = useRef(false);

  useEffect(() => {
    const email = profileData?.email;
    const hasCompanyData = companyProfile?.data?.message?.company_name;
    const companyError = companyProfile?.error;

    if (!email) {
      return;
    }

    if (companyError) {
      failedOnceRef.current = true;
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    if (hasCompanyData && !isInitializedRef.current) {
      reset({
        companyName: companyProfile.data.message.company_name || '',
        websiteUrl: companyProfile.data.message.company_website || '',
        companyDescription: companyProfile.data.message.company_description || '',
      });
      lastFetchedEmailRef.current = email;
      hasAttemptedFetchRef.current = true;
      isInitializedRef.current = true;
      return;
    }

    const alreadyTriedCurrentEmail =
      email === lastFetchedEmailRef.current && hasAttemptedFetchRef.current;
    if (alreadyTriedCurrentEmail || failedOnceRef.current) {
      return;
    }

    lastFetchedEmailRef.current = email;
    hasAttemptedFetchRef.current = true;
    inFlightRef.current = true;

    dispatch(getCompanyAndUserProfile(email))
      .then((response) => {
        const responseData =
          response.payload?.message || response.payload?.data?.message || response.payload;
        reset({
          companyName: responseData?.company_name || '',
          websiteUrl: responseData?.company_website || '',
          companyDescription: responseData?.company_description || '',
        });
        isInitializedRef.current = true;
        failedOnceRef.current = false;
      })
      .catch((fetchError) => {
        console.error(
          '[CompanyProfile] fetch failed for getCompanyAndUserProfile',
          fetchError?.payload || fetchError,
        );
        showErrorToast(fetchError?.payload || fetchError, {
          defaultMessage: 'Failed to get company profile',
        });
        failedOnceRef.current = true;
      })
      .finally(() => {
        inFlightRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.email]);

  // Check if company has a custom logo (assuming company_logo field exists in companyProfile.data)
  const hasCompanyLogo = Boolean(
    companyProfile?.data?.message?.company_logo &&
    companyProfile.data.message.company_logo.trim() !== '',
  );

  // Get initials: first letter of first word + last letter of last word
  const getCompanyInitials = () => {
    const companyName =
      companyProfile?.data?.message?.company_name || companyProfile?.data?.company_name || '';
    if (!companyName) return '';

    const nameParts = companyName.trim().split(' ').filter(Boolean);
    if (nameParts.length === 0) return '';

    const firstWord = nameParts[0];
    const lastWord = nameParts.at(-1);

    const firstLetter = firstWord[0]?.toUpperCase() || '';
    const lastLetter = lastWord.at(-1)?.toUpperCase() || '';

    return firstLetter + lastLetter;
  };

  const handleUploadCompanyLogo = (file) => {
    // companyProfile in handleUploadCompanyLogo {data: {message: {company_name: 'DevX', company_logo: 'https://devx.com/logo.png', company_description: 'DevX bio test', company_website: 'https://devx.com', editable: true, is_internal: 1}}, error: null, isLoading: false, status: null}
    const formData = new FormData();
    formData.append('file', file);
    if (companyProfile?.data?.message?.is_internal == 1) {
      formData.append('doctype', 'Company');
      formData.append('fieldname', 'company_logo');
    } else {
      formData.append('doctype', 'Customer');
      formData.append('fieldname', 'image');
    }

    // formData.append('fieldname', 'image');
    formData.append('docname', companyProfile?.data?.message?.company_name);

    dispatch(uploadProfileImageUser(formData))
      .then(() => {
        // Refresh company profile to get updated logo
        if (profileData.email) {
          dispatch(getCompanyAndUserProfile(profileData.email));
        }
      })
      .catch(() => {
        // Error handled by Redux
      });
  };

  const handleRemoveCompanyLogo = () => {
    const logoUrl =
      companyProfile?.data?.message?.company_logo || companyProfile?.data?.company_logo;
    if (!logoUrl) {
      return;
    }

    dispatch(deleteFileByUrl(logoUrl))
      .then(() => {
        // File deleted successfully, refresh company profile
        if (profileData.email) {
          dispatch(getCompanyAndUserProfile(profileData.email));
        }
      })
      .catch(() => {
        // Error handled by Redux
      });
  };

  const handleDiscard = () => {
    // Reset to original values from companyProfile
    if (companyProfile?.data?.message) {
      reset({
        companyName: companyProfile.data.message.company_name || '',
        websiteUrl: companyProfile.data.message.company_website || '',
        companyDescription: companyProfile.data.message.company_description || '',
      });
    } else {
      reset();
    }
  };

  return (
    <CardLayout cardTitle='Company Settings' cardDescription='Company profile information'>
      {companyProfile.isLoading ? (
        <div className='max-w-[800px] w-full flex flex-col items-center justify-center'>
          {/* Logo Upload Skeleton */}
          <div className='w-full flex gap-[20px] items-center justify-between mb-6'>
            <div className='w-full flex gap-[10px] items-start justify-start'>
              <div className='w-[40px] h-[40px] rounded-full bg-[var(--color-bg-weak-50)] animate-pulse' />
              <div className='flex flex-col gap-1 items-start justify-start'>
                <div className='h-4 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-3 w-40 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              </div>
            </div>
            <div className='h-9 w-20 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
          </div>

          {/* Form Fields Skeleton */}
          <div className='w-full flex items-start justify-start pt-5'>
            <div className='w-full grid grid-cols-2 gap-6'>
              {/* Company Name Field Skeleton */}
              <div className='w-full flex flex-col gap-2'>
                <div className='h-4 w-28 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              </div>
              {/* Website URL Field Skeleton */}
              <div className='w-full flex flex-col gap-2'>
                <div className='h-4 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-10 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              </div>
              {/* Company Description Field Skeleton */}
              <div className='w-full flex flex-col gap-2'>
                <div className='h-4 w-36 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-24 w-full bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
                <div className='h-4 w-48 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
              </div>
            </div>
          </div>

          {/* Buttons Skeleton */}
          <div className='flex gap-[16px] mt-6'>
            <div className='h-10 w-32 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
            <div className='h-10 w-24 bg-[var(--color-bg-weak-50)] rounded animate-pulse' />
          </div>
        </div>
      ) : (
        <>
          <div className='max-w-[800px] w-full flex flex-col items-center justify-center'>
            <div className='w-full flex gap-[20px] items-center justify-between'>
              {/*logo */}

              <div className='w-full flex gap-[10px]  items-start justify-start'>
                <span className='w-[80px] h-[80px] rounded-full flex items-center justify-center overflow-hidden bg-[var(--color-bg-weak-50)]'>
                  {hasCompanyLogo ? (
                    <img
                      src={companyProfile?.data?.message?.company_logo}
                      alt='company logo'
                      className='w-full object-cover h-full rounded-full'
                    />
                  ) : (
                    <span className='text-[var(--color-text-main-900)] label-large font-medium'>
                      {getCompanyInitials()}
                    </span>
                  )}
                </span>

                <div className='flex flex-col gap-1 items-start justify-start'>
                  <span className='text-[var(--color-text-main-900)] text-[14px]'>
                    Upload Company Logo
                  </span>
                  <span className='text-[var(--color-text-sub-500)] text-[12px]'>
                    Min 400x400px, PNG or JPEG
                  </span>
                </div>
              </div>

              {isEditable && (
                <div className='flex gap-2'>
                  {hasCompanyLogo ? (
                    <>
                      <input
                        type='file'
                        ref={fileInputRef}
                        accept='image/png,image/jpeg'
                        className='hidden'
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadCompanyLogo(file);
                          }
                        }}
                      />
                      <Button.Root
                        variant='error'
                        mode='stroke'
                        size='small'
                        type='button'
                        onClick={handleRemoveCompanyLogo}
                      >
                        Remove
                      </Button.Root>
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Edit
                      </Button.Root>
                    </>
                  ) : (
                    <>
                      <input
                        type='file'
                        ref={fileInputRef}
                        accept='image/png,image/jpeg'
                        className='hidden'
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadCompanyLogo(file);
                          }
                        }}
                      />
                      <Button.Root
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload
                      </Button.Root>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className='w-full flex items-start justify-start'>
              <form
                id='company-profile-form'
                className='pt-5 flex items-start justify-start w-full'
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className='w-full flex flex-col gap-6'>
                  <div className='w-full grid grid-cols-2 gap-6  '>
                    {/* Company Name */}
                    <div className=' w-full flex flex-col gap-2'>
                      <Label.Root>
                        Company Name
                        <Label.Asterisk />
                      </Label.Root>
                      <Input.Root size='medium' hasError={Boolean(errors.companyName)}>
                        <Input.Wrapper>
                          <Input.Icon as={RiBuildingLine} />
                          <Input.Input
                            type='text'
                            placeholder='Enter your company name'
                            {...register('companyName')}
                            disabled={true}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.companyName && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.companyName.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Website URL */}
                    <div className='w-full flex flex-col gap-2'>
                      <Label.Root>Website URL</Label.Root>
                      <Input.Root
                        size='medium'
                        className='w-full'
                        hasError={Boolean(errors.websiteUrl)}
                      >
                        <Input.Wrapper>
                          <Input.Icon as={RiGlobalLine} />
                          <Input.Input
                            placeholder='https://example.com'
                            {...register('websiteUrl')}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.websiteUrl && (
                        <Hint.Root hasError>
                          <Hint.Icon as={RiErrorWarningFill} />
                          {errors.websiteUrl.message}
                        </Hint.Root>
                      )}
                    </div>

                    {/* Company Description */}

                    {/* Error message from API */}
                    {error && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {error}
                      </Hint.Root>
                    )}
                  </div>

                  <div className='w-full flex flex-col gap-2'>
                    <Label.Root>Company Description</Label.Root>
                    <Controller
                      name='companyDescription'
                      control={control}
                      render={({ field }) => (
                        <Textarea.Root
                          {...field}
                          rows={4}
                          maxLength={200}
                          placeholder='Enter description'
                          hasError={Boolean(errors.companyDescription)}
                          className='min-h-[100px]'
                        >
                          <Textarea.CharCounter
                            current={field.value?.length || 0}
                            max={200}
                            className='text-text-sub-500'
                          />
                        </Textarea.Root>
                      )}
                    />
                    <div className='flex w-full items-center text-[var(--color-text-soft-400)] text-[12px] justify-start gap-[4px] '>
                      <span>
                        <RiInformationFill className='size-5' />
                      </span>{' '}
                      You can describe your company briefly
                    </div>
                    {errors.companyDescription && (
                      <Hint.Root hasError>
                        <Hint.Icon as={RiErrorWarningFill} />
                        {errors.companyDescription.message}
                      </Hint.Root>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {isEditable && (
            <div className='flex gap-[16px]'>
              <Button.Root
                variant='primary'
                mode='filled'
                size='medium'
                type='submit'
                form='company-profile-form'
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Apply Changes'}
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='medium'
                type='button'
                onClick={handleDiscard}
              >
                Discard
              </Button.Root>
            </div>
          )}
        </>
      )}
    </CardLayout>
  );
};

export default CompanyProfile;
