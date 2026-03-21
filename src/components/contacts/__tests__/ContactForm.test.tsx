/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div>{children}</div>,
    button: ({ children, ...props }: any) => <button>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { ContactForm } from '../ContactForm';

const defaultValues = {
  name: '',
  nickname: '',
  surname: '',
  job_title: '',
  company: '',
  phone: '',
  email: '',
  contact_type: 'cliente',
};

describe('ContactForm', () => {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByLabelText(/Nome Principal/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sobrenome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Apelido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cargo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Empresa/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it('shows required markers for name and phone', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByText(/Nome Principal \*/)).toBeInTheDocument();
    expect(screen.getByText(/Telefone \*/)).toBeInTheDocument();
  });

  it('calls onChange when name is typed', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Nome Principal/), { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalledWith('name', 'John');
  });

  it('calls onChange when phone is typed', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '+5511999' } });
    expect(onChange).toHaveBeenCalledWith('phone', '+5511999');
  });

  it('calls onChange when email is typed', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'a@b.com' } });
    expect(onChange).toHaveBeenCalledWith('email', 'a@b.com');
  });

  it('calls onChange for surname', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Sobrenome/), { target: { value: 'Doe' } });
    expect(onChange).toHaveBeenCalledWith('surname', 'Doe');
  });

  it('calls onChange for nickname', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Apelido/), { target: { value: 'JD' } });
    expect(onChange).toHaveBeenCalledWith('nickname', 'JD');
  });

  it('calls onChange for company', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Empresa/), { target: { value: 'Acme' } });
    expect(onChange).toHaveBeenCalledWith('company', 'Acme');
  });

  it('calls onChange for job_title', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Cargo/), { target: { value: 'CEO' } });
    expect(onChange).toHaveBeenCalledWith('job_title', 'CEO');
  });

  it('renders submit button with correct label', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Salvar" />
    );
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onSubmit when submit button clicked', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.click(screen.getByText('Add'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays pre-filled values', () => {
    const filledValues = {
      name: 'Alice',
      nickname: 'Ali',
      surname: 'Wonder',
      job_title: 'Eng',
      company: 'Acme',
      phone: '+5511',
      email: 'a@a.com',
      contact_type: 'lead',
    };
    render(
      <ContactForm values={filledValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Save" />
    );
    expect((screen.getByLabelText(/Nome Principal/) as HTMLInputElement).value).toBe('Alice');
    expect((screen.getByLabelText(/Telefone/) as HTMLInputElement).value).toBe('+5511');
    expect((screen.getByLabelText(/Email/) as HTMLInputElement).value).toBe('a@a.com');
  });

  it('handles null optional fields without crashing', () => {
    const nullValues = {
      name: 'Test',
      phone: '123',
      nickname: null,
      surname: null,
      job_title: null,
      company: null,
      email: null,
      contact_type: null,
    };
    render(
      <ContactForm values={nullValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByLabelText(/Nome Principal/)).toBeInTheDocument();
  });

  it('shows email field as type email', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByLabelText(/Email/).getAttribute('type')).toBe('email');
  });

  it('shows placeholders on inputs', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    expect(screen.getByPlaceholderText('Nome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sobrenome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/99999/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email@/)).toBeInTheDocument();
  });

  it('handles special characters in input', () => {
    render(
      <ContactForm values={defaultValues} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} submitLabel="Add" />
    );
    fireEvent.change(screen.getByLabelText(/Nome Principal/), { target: { value: "O'Brien <script>" } });
    expect(onChange).toHaveBeenCalledWith('name', "O'Brien <script>");
  });
});
