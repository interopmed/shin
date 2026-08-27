'use client';

import { useEffect } from 'react';

export default function AdminLTEScripts() {
  useEffect(() => {
    const loadModulesSequentially = async () => {
      const loader = [
        ['jQuery UI', () => import('jquery-ui-dist/jquery-ui.min.js')],
        ['Bootstrap', () => import('bootstrap/dist/js/bootstrap.bundle.min.js')],
        ['Chart.js', () => import('chart.js/auto')],
        ['Sparkline', () => import('jquery-sparkline/jquery.sparkline.min.js')],
        ['JQVMap Core', () => import('jqvmap/dist/jquery.vmap.min.js')],
        ['JQVMap USA', () => import('jqvmap/dist/maps/jquery.vmap.usa.js')],
        ['jQuery Knob', () => import('jquery-knob/dist/jquery.knob.min.js')],
        ['Moment', () => import('moment')],
        ['DateRangePicker', () => import('daterangepicker/daterangepicker.js')],
        ['Tempusdominus', () => import('tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4.min.js')],
        ['Summernote', () => import('summernote/dist/summernote-bs4.min.js')],
        ['OverlayScrollbars', () => import('overlayscrollbars/js/jquery.overlayScrollbars.min.js')],
        ['AdminLTE', () => import('admin-lte/dist/js/adminlte.min.js')],
        ['DataTables Core', () => import('datatables.net')],
        ['DataTables BS4', () => import('datatables.net-bs4')],
        ['DataTables Responsive', () => import('datatables.net-responsive')],
        ['DataTables Responsive BS4', () => import('datatables.net-responsive-bs4')],
        ['DataTables Buttons', () => import('datatables.net-buttons')],
        ['DataTables Buttons BS4', () => import('datatables.net-buttons-bs4')],
      ] as const;

      const jqueryModule = await import('jquery');
      const jquery = (jqueryModule.default ?? jqueryModule) as unknown;
      (window as unknown as { $: unknown }).$ = jquery;
      (window as unknown as { jQuery: unknown }).jQuery = jquery;

      for (const [name, load] of loader) {
        try {
          const mod = await load();
          if (name === 'Chart.js') {
            const maybeChart = (mod as { Chart?: unknown }).Chart;
            if (maybeChart) {
              (window as unknown as { Chart: unknown }).Chart = maybeChart;
            }
          }
          if (name === 'Moment') {
            const momentValue = (mod as { default?: unknown }).default ?? mod;
            (window as unknown as { moment: unknown }).moment = momentValue;
          }
        } catch {
          console.warn(`Failed to load module: ${name}`);
        }
      }

      // Initialize spinner hide functionality
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const spinner = document.getElementById('spinner');
          if (spinner) {
            spinner.classList.remove('show');
          }
        }, 500);
      }
    };

    loadModulesSequentially();

    return () => {
      (window as unknown as { $?: unknown }).$ = undefined;
      (window as unknown as { jQuery?: unknown }).jQuery = undefined;
      (window as unknown as { Chart?: unknown }).Chart = undefined;
      (window as unknown as { moment?: unknown }).moment = undefined;
    };
  }, []);

  return null;
}
