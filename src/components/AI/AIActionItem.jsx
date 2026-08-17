import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  DollarSign,
  User,
  Shield,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import apiClient from '@/api/axios';
import { showErrorToast } from '@/utils/error-utils';

const CATEGORY_ICONS = {
  facility: Wrench,
  billing: DollarSign,
  client: User,
  compliance: Shield,
  sales: TrendingUp,
  general: AlertCircle,
};

const PRIORITY_STYLES = {
  urgent: 'bg-red-500 text-white',
  this_week: 'bg-orange-500 text-white',
  strategic: 'bg-teal-500 text-white',
};

const PRIORITY_LABELS = {
  urgent: 'Urgent',
  this_week: 'This Week',
  strategic: 'Strategic',
};

async function callAiMethod(method, args) {
  const response = await apiClient.post(`/method/${method}`, args);
  return response.data?.message ?? response.data;
}

export default function AIActionItem({ action, centerId, onTicketCreated, onCloseModal }) {
  const navigate = useNavigate();
  const [relatedTicket, setRelatedTicket] = useState(null);
  const [isSearching, setIsSearching] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function searchTickets() {
      try {
        const msg = await callAiMethod('devx_ai.summary.api.find_related_tickets', {
          center_id: centerId,
          search_terms_json: JSON.stringify(action.ticket_search_terms || []),
        });

        if (isMounted && msg?.success && msg.tickets?.length > 0) {
          setRelatedTicket(msg.tickets[0]);
        }
      } catch (error) {
        console.error('Failed to search related tickets:', error);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }

    searchTickets();

    return () => {
      isMounted = false;
    };
  }, [centerId, action.ticket_search_terms]);

  const handleCreateTicket = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const msg = await callAiMethod('devx_ai.summary.api.create_ticket_from_action', {
        center_id: centerId,
        title: action.suggested_ticket_title,
        description: action.suggested_ticket_description,
        ticket_type: action.suggested_ticket_type || 'General',
        priority: action.priority,
      });

      if (msg?.success) {
        setRelatedTicket({ name: msg.ticket_name });
        if (onTicketCreated) onTicketCreated(msg.ticket_name);
      } else {
        setCreateError(msg?.error || 'Failed to create ticket');
        showErrorToast(msg?.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Ticket creation error:', error);
      const message =
        error?.response?.data?.message?.error || error?.message || 'Failed to create ticket';
      setCreateError(message);
      showErrorToast(message);
    } finally {
      setIsCreating(false);
    }
  };

  const IconComponent = CATEGORY_ICONS[action.category?.toLowerCase()] || AlertCircle;
  const badgeStyle = PRIORITY_STYLES[action.priority?.toLowerCase()] || PRIORITY_STYLES.strategic;
  const badgeLabel = PRIORITY_LABELS[action.priority?.toLowerCase()] || 'Strategic';

  const handleViewTicket = (e) => {
    e.preventDefault();
    if (relatedTicket?.name) {
      onCloseModal?.();
      navigate(`/ticket-management?ticket=${relatedTicket.name}`);
    }
  };

  return (
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 mb-2 bg-white rounded-lg border border-slate-200'>
      <div className='flex items-start gap-3 flex-1 min-w-0'>
        <div className='mt-1 flex-shrink-0 text-slate-400'>
          <IconComponent size={18} />
        </div>
        <div className='flex flex-col min-w-0 gap-1.5'>
          <div className='flex items-center gap-2'>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badgeStyle}`}
            >
              {badgeLabel}
            </span>
            {isSearching && <Loader2 size={12} className='text-slate-400 animate-spin' />}
          </div>
          <p className='text-sm font-medium text-slate-700 leading-snug'>{action.text}</p>
        </div>
      </div>

      <div className='flex-shrink-0 self-start sm:self-center ml-10 sm:ml-0'>
        {relatedTicket ? (
          <a
            href={`/ticket-management?ticket=${relatedTicket.name}`}
            onClick={handleViewTicket}
            className='inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors'
          >
            View {relatedTicket.name}
            <ArrowRight size={16} />
          </a>
        ) : (
          <div className='flex flex-col items-end gap-1'>
            <button
              onClick={handleCreateTicket}
              disabled={isCreating || isSearching}
              className='inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-teal-700 bg-white border border-teal-600 rounded-md hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className='mr-2 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </button>
            {createError && (
              <span className='text-xs text-red-500 mt-1 max-w-[150px] text-right leading-tight'>
                {createError}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
