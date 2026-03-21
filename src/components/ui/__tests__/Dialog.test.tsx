import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../dialog';

describe('Dialog', () => {
  it('does not show content when closed', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('shows content when open prop is true', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('My Dialog')).toBeInTheDocument();
    });
  });

  it('renders close button by default', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Close')).toBeInTheDocument(); // sr-only text
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('renders dialog header', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Header Title</DialogTitle>
          </DialogHeader>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('renders dialog description', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>My description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('My description')).toBeInTheDocument();
  });

  it('renders dialog footer', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
          <DialogFooter>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onOpenChange when closing', async () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    // Click close button
    fireEvent.click(screen.getByText('Close').closest('button')!);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape key press', async () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('renders DialogClose component', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
          <DialogClose>Cancel</DialogClose>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('applies size variant sm', () => {
    render(
      <Dialog open>
        <DialogContent size="sm">
          <DialogTitle>Small</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('max-w-sm');
  });

  it('applies size variant lg', () => {
    render(
      <Dialog open>
        <DialogContent size="lg">
          <DialogTitle>Large</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('max-w-2xl');
  });

  it('applies custom className to content', () => {
    render(
      <Dialog open>
        <DialogContent className="custom-dialog">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('custom-dialog');
  });

  it('renders overlay when open', () => {
    const { container } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    // Overlay has backdrop-blur-md class
    const overlay = document.querySelector('[data-state="open"].fixed');
    expect(overlay).toBeInTheDocument();
  });
});
