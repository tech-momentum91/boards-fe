import React, { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  RiBuildingLine,
  RiChatSmile2Line,
  RiStickyNoteLine,
  RiStarSmileFill,
  RiEmotionSadLine,
  RiEmotionNormalLine,
  RiEmotionLaughLine,
  RiArrowDownSLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Popover from '@/components/ui/popover';
import * as LinkButton from '@/components/ui/link-button';
import * as Textarea from '@/components/ui/textarea';
import * as Input from '@/components/ui/input';
import ErrorText from '@/components/ui/error-text';
import CsiRatingScale from '@/components/clients-management/client-detail-csi/csi-rating-scale';
import { CSI_SCORE_CARD_STYLES } from '@/constants/csi-constants';
import { getScoreLabel, getScoreColor } from '@/utils/csi-utils';
import { formatDateWithOrdinal, formatMonthYear, formatPeriod } from '@/utils/date-utils';
import { getInitials } from '@/lib/utils';
import * as Label from '@/components/ui/label';

// Simplified validation schema
const csiFormSchema = z.object({
  serviceRatings: z
    .array(
      z.object({
        rowId: z.string(),
        name: z.string().optional(),
        service: z.string(),
        rating: z
          .number({
            required_error: 'Please select a rating from 1 to 10 using the scale above.',
            invalid_type_error: 'Please select a rating from 1 to 10 using the scale above.',
          })
          .min(1, 'Please select a rating from 1 to 10 using the scale above.')
          .max(10, 'Please select a rating from 1 to 10 using the scale above.')
          .nullable(),
        comment: z.string().optional(),
      }),
    )
    .refine((ratings) => ratings.some((r) => typeof r.rating === 'number'), {
      message: 'Please select a rating for at least one service.',
    }),
  overallComment: z.string().max(200).optional(),
  submitBy: z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
});

const ClientDetailCsiForm = ({
  survey = {},
  isEditable = true,
  isSubmitting = false,
  onSubmit,
  showScoreLabel,
}) => {
  // simple, consistent fallbacks: if missing show 'N/A' or '--' where appropriate
  const baseScore =
    Number.parseFloat(survey.csi_score ?? survey.score ?? survey.custom_csi_score ?? 0) || 0;

  const quarter =
    survey.quarter ||
    formatMonthYear(
      survey.quarter ?? survey.period_start ?? survey.creation ?? survey.date ?? null,
    ) ||
    'N/A';

  const year = survey.year ?? 'N/A';
  const centerName = survey.center_name ?? survey.custom_center_name ?? survey.location ?? 'N/A';
  const clientName = survey.client_name ?? survey.customer_name ?? 'N/A';

  const startDate = survey.start_date ?? survey.period_start ?? null;
  const submissionDate = survey.submission_date ?? survey.submitted_date ?? null;
  const period =
    startDate && submissionDate
      ? formatPeriod(startDate, submissionDate)
      : startDate
        ? formatDateWithOrdinal(startDate)
        : '--';

  const submittedUser = survey.submitted_user ?? survey.submitted_by ?? survey.respondent ?? 'N/A';
  const readonlyComment = survey.comment ?? survey.overall_comment ?? survey.custom_comment ?? '';
  const readonlySubmitBy = survey.submit_by ?? survey.submitted_by ?? survey.submitted_user ?? '';

  const statusLower = (survey.status ?? '').toLowerCase();
  const statusAllowsEdit = statusLower === 'pending' || statusLower === 'draft';
  const canEdit = Boolean(isEditable && statusAllowsEdit);

  // Normalize service ratings source (keep it straightforward)
  const initialServiceRatings = useMemo(() => {
    const raw = survey.service_rating ?? survey.service_ratings ?? [];
    if (!Array.isArray(raw)) return [];

    return raw.map((item = {}, index) => ({
      rowId: item.name ?? `${item.service ?? item.category ?? 'service'}-${index}`,
      name: item.name ?? undefined,
      service: item.service ?? item.category ?? 'N/A',
      rating: item.rating ?? item.score ?? null,
      comment: item.comment ?? '',
    }));
  }, [survey.service_rating, survey.service_ratings]);

  const {
    control,
    handleSubmit: handleFormSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(csiFormSchema),
    defaultValues: {
      serviceRatings: initialServiceRatings,
      overallComment: readonlyComment,
      submitBy: readonlySubmitBy,
    },
  });

  const { fields } = useFieldArray({ control, name: 'serviceRatings' });
  const watchedServiceRatings = useWatch({ control, name: 'serviceRatings' });

  // Reset when incoming survey changes (keeps behaviour predictable)
  useEffect(() => {
    reset({
      serviceRatings: initialServiceRatings,
      overallComment: readonlyComment,
      submitBy: readonlySubmitBy,
    });
  }, [initialServiceRatings, readonlyComment, readonlySubmitBy, reset]);

  // Live score calculation (simple average of valid numeric ratings when editing)
  const liveScore = useMemo(() => {
    if (!canEdit) return baseScore || 0;
    const ratings = (watchedServiceRatings ?? [])
      .map((r) => Number(r?.rating))
      .filter((v) => Number.isFinite(v) && v >= 1 && v <= 10);
    if (ratings.length === 0) return 0;
    const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
    return Number(avg.toFixed(2));
  }, [canEdit, watchedServiceRatings, baseScore]);

  const score = liveScore;
  const scoreLabel = getScoreLabel(score);
  const scoreColorVariant = getScoreColor(score);
  const scoreStyles = CSI_SCORE_CARD_STYLES[scoreColorVariant] ?? CSI_SCORE_CARD_STYLES.default;

  const onSubmitForm = async (data) => {
    if (!canEdit || !onSubmit) return;
    await onSubmit({
      serviceRatings: data.serviceRatings,
      overallComment: data.overallComment ?? '',
      submitBy: String(data.submitBy ?? '').trim(),
    });
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-1.5'>
        <h2 className='text-title-h5 text-text-main-900'>
          {quarter} , {year}
        </h2>
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-2'>
            <RiBuildingLine className='size-5 text-text-sub-500' />
            <span className='label-small text-text-soft-400 text-nowrap'>{centerName}</span>
          </div>
          <span className='size-1 rounded-full bg-text-soft-400' />
          <div className='flex items-center gap-2'>
            <RiUserLine className='size-5 text-text-sub-500' />
            <span className='label-small text-text-soft-400 text-nowrap'>{clientName}</span>
          </div>

          {!statusAllowsEdit && (
            <>
              <span className='size-1 rounded-full bg-text-soft-400' />
              <div className='flex items-center gap-1.5 overflow-auto'>
                <Avatar.Root size='24' color='gray'>
                  <span className='text-label-xs'>{getInitials(submittedUser)}</span>
                </Avatar.Root>
                <span className='label-small text-text-soft-400 truncate'>{submittedUser}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`rounded-xl p-4 ${scoreStyles.cardBg}`}>
        <div className='flex items-start gap-4'>
          <div className='flex flex-col gap-1 flex-1'>
            <div className='flex items-baseline gap-2'>
              <span className={`text-title-h5 ${scoreStyles.scoreText}`}>{score}/10</span>
              {showScoreLabel && (
                <span className={`text-label-md ${scoreStyles.scoreText}`}>({scoreLabel})</span>
              )}
            </div>
            <span
              className={`text-subheading-xs uppercase tracking-[0.48px] opacity-72 ${scoreStyles.scoreText}`}
            >
              CSI Score
            </span>
          </div>
          <div className={`${scoreStyles.starWrap} rounded-full p-1 shadow-regular-xs shrink-0`}>
            <RiStarSmileFill className={`size-5 ${scoreStyles.starIcon}`} />
          </div>
        </div>
      </div>

      <div>
        <div className='flex items-center justify-between mb-5'>
          <h3 className='text-label-lg text-text-sub-500'>Service Ratings</h3>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className='flex items-center gap-1 text-label-sm text-text-main-900'>
                View Rating Scale
                <LinkButton.Icon as={RiArrowDownSLine} />
              </button>
            </Popover.Trigger>
            <Popover.Content
              className='p-0'
              side='bottom'
              align='end'
              sideOffset={8}
              showArrow={false}
            >
              <div className='bg-bg-weak-100 border border-stroke-soft-200 rounded-2xl p-1 shadow-regular-large'>
                <div className='bg-bg-white-0 rounded-xl overflow-hidden'>
                  <div className='flex items-center gap-3 px-4 py-3 border-b border-stroke-soft-200'>
                    <div className='flex items-center justify-center rounded-full border border-error-light bg-error-lighter p-2.5 shrink-0'>
                      <RiEmotionSadLine className='size-[22px] text-error-dark' />
                    </div>
                    <div className='flex flex-col flex-1'>
                      <span className='text-label-lg font-bold text-error-dark'>0 – 6</span>
                      <span className='text-label-xs text-error-darker opacity-72'>
                        Needs Significant Improvement
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 px-4 py-3 border-b border-stroke-soft-200'>
                    <div className='flex items-center justify-center rounded-full border border-away-light bg-away-lighter p-2.5 shrink-0'>
                      <RiEmotionNormalLine className='size-[22px] text-away-dark' />
                    </div>
                    <div className='flex flex-col flex-1'>
                      <span className='text-label-lg font-bold text-away-dark'>7 – 8</span>
                      <span className='text-label-xs text-away-dark opacity-72'>
                        Meets Expectations
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 px-4 py-3'>
                    <div className='flex items-center justify-center rounded-full border border-success-light bg-success-lighter p-2.5 shrink-0'>
                      <RiEmotionLaughLine className='size-[22px] text-success-dark' />
                    </div>
                    <div className='flex flex-col flex-1'>
                      <span className='text-label-lg font-bold text-success-dark'>9 – 10</span>
                      <span className='text-label-xs text-success-darker opacity-72'>
                        Exceeds Expectations
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>

        <div className='border border-stroke-soft-200 rounded-xl overflow-hidden'>
          {fields.length > 0 ? (
            fields.map((field, index) => {
              const serviceRating = canEdit
                ? (watchedServiceRatings?.[index] ?? field)
                : (initialServiceRatings[index] ?? field);
              const service = serviceRating?.service ?? 'N/A';
              const rating = serviceRating?.rating ?? null;
              const serviceComment = serviceRating?.comment ?? '';
              const fieldError = errors.serviceRatings?.[index]?.rating;

              return (
                <div
                  key={field.id}
                  className='border-b border-stroke-soft-200 last:border-b-0 bg-white px-5 py-4'
                >
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center justify-between gap-4'>
                      <h4 className='text-label-md text-text-main-900'>
                        {service} {canEdit && <Label.Asterisk />}
                      </h4>

                      {canEdit ? (
                        <Controller
                          name={`serviceRatings.${index}.rating`}
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <CsiRatingScale
                              rating={value ?? null}
                              editable={canEdit}
                              onChange={onChange}
                            />
                          )}
                        />
                      ) : (
                        <CsiRatingScale rating={rating} editable={false} />
                      )}
                    </div>

                    {canEdit ? (
                      <div className='mt-2'>
                        <div className='flex items-center gap-1.5 mb-1'>
                          <RiChatSmile2Line className='size-5 text-text-soft-400' />
                          <span className='text-label-xs text-text-sub-500'>
                            Comment (optional)
                          </span>
                        </div>
                        <Controller
                          name={`serviceRatings.${index}.comment`}
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <Textarea.Root
                              size='small'
                              simple
                              value={value ?? ''}
                              onChange={(e) => onChange(e.target.value)}
                              rows={2}
                              placeholder='Add a comment for this service'
                            />
                          )}
                        />

                        {fieldError && <ErrorText>{fieldError.message}</ErrorText>}
                      </div>
                    ) : (
                      serviceComment && (
                        <div className='flex items-center gap-1.5 mt-1'>
                          <RiChatSmile2Line className='size-5 text-text-soft-400' />
                          <span className='text-label-xs text-text-sub-500'>{serviceComment}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className='px-5 py-4 text-center text-paragraph-sm text-text-sub-500'>
              No service ratings available
            </div>
          )}
        </div>
      </div>

      {canEdit ? (
        <div className='bg-white rounded-xl border border-stroke-soft-200 p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <RiStickyNoteLine className='size-5 text-text-soft-400' />
            <h4 className='text-label-md text-text-sub-500'>Overall Comment</h4>
          </div>

          <Controller
            name='overallComment'
            control={control}
            render={({ field: { onChange, value } }) => (
              <Textarea.Root
                size='small'
                id='csi-overall-comment'
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                placeholder='Share overall feedback about this space'
                maxLength={200}
                className='min-h-[116px]'
              >
                <Textarea.CharCounter
                  current={value?.length ?? 0}
                  max={200}
                  className='text-text-sub-500'
                />
              </Textarea.Root>
            )}
          />
          {errors.overallComment && <ErrorText>{errors.overallComment.message}</ErrorText>}
        </div>
      ) : null}

      {canEdit ? (
        <div className='bg-white rounded-xl border border-stroke-soft-200 p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <h4 className='text-label-md text-text-sub-500'>
              Your Name <Label.Asterisk />
            </h4>
          </div>

          <Controller
            name='submitBy'
            control={control}
            render={({ field: { onChange, value } }) => (
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder='Enter your name'
                    maxLength={200}
                  />
                </Input.Wrapper>
              </Input.Root>
            )}
          />
          {errors.submitBy && <ErrorText>{errors.submitBy.message}</ErrorText>}
        </div>
      ) : null}

      {!canEdit && readonlyComment ? (
        <div className='bg-bg-weak-100 rounded-xl p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <RiStickyNoteLine className='size-5 text-text-soft-400' />
            <h4 className='text-label-md text-text-sub-500'>Comment</h4>
          </div>
          <p className='text-paragraph-sm text-text-sub-500'>{readonlyComment}</p>
        </div>
      ) : null}

      {canEdit && onSubmit && (
        <form onSubmit={handleFormSubmit(onSubmitForm)}>
          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-base text-white text-label-sm disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isSubmitting ? 'Submitting...' : 'Submit CSI'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ClientDetailCsiForm;
